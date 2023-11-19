const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const generator = require('generate-password');
const { SlashCommandBuilder } = require('@discordjs/builders');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ]});
const config = require("./config.json");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const joiner = require('./joiner');

console.clear()

const commands = [
    new SlashCommandBuilder().setName('start').setDescription('Üye gönderimini başlatır.').addStringOption(option =>
        option.setName('key')
        .setDescription('Size verilen kod')
        .setRequired(true)
    ).addStringOption(option =>
        option.setName('sunucuid')
        .setDescription('Üyelerin gönderileceği sunucunun ID')
        .setRequired(true)
    ),
    new SlashCommandBuilder().setName('keys').setDescription('Admin komutu - Oluşturulan Keyleri listeler.'),
    new SlashCommandBuilder().setName('yazdir').setDescription('Admin komutu - Keyleri txt olarak atar.').addIntegerOption(option =>
        option.setName('limit')
        .setDescription('Kaç tane key yazdıracağını ayarlar.')
        .setRequired(false)
    ).addStringOption(option =>
        option.setName('filter')
        .setDescription('Stoğa göre filtreleyip yazdırır.')
        .setRequired(false)
    ),
    new SlashCommandBuilder().setName('key-sil').setDescription('Admin komutu - Key siler.').addStringOption(option =>
        option.setName('key')
        .setDescription('Silinecek key ya da all')
        .setRequired(true)
    ),
    new SlashCommandBuilder().setName('key-üret').setDescription('Admin komutu - Key oluşturur.').addIntegerOption(option => 
        option.setName('miktar')
        .setDescription('Key kullanıldığında kaç üye gönderileceğini girin.')
        .setRequired(true)
    ).addStringOption(option => 
        option.setName('paket')
        .setDescription('Bir paket seçin.')
        .addChoices({ name: 'Online', value: 'Online' }, { name: 'Offline', value: 'Offline' })
        .setRequired(true)
    ).addIntegerOption(option => 
        option.setName('multi')
        .setDescription('Çoklu key üretimi içindir')
        .setRequired(false)
    )
];

const commandData = commands.map(command => command.toJSON());

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  client.application.commands.set(commandData).then(() => {
    console.log('Commands registered successfully!');
  }).catch(error => {
    console.error('Error registering commands:', error);
  });
});

  
client.on('interactionCreate', async interaction => {

    if (interaction.commandName === 'start') {
        const key = interaction.options.getString('key')
        const serverID = interaction.options.getString('sunucuid')
        const isValid = await db.get(`keys.${key}`);
        console.log(isValid)
        if(isValid) {
            const keyInfo = isValid[0]
            const amount = keyInfo["amount"]
            const type = keyInfo["type"]
            await interaction.reply({ content: `${amount} ${type} üye gönderiliyor.`, ephemeral: true });
            try {
                await joiner.processTokens(serverID, amount, type)
            } catch(e) {
                console.log(e)
            }
        } else {
            await interaction.reply({ content: `Geçersiz key!`, ephemeral: true });
        }
    }

    if (interaction.commandName === 'keys') {
        if(!config["admins"].includes(interaction.user.id)) return await interaction.reply({ content: "Bu komut için yeterli iznin yok!", ephemeral: true })
        const allkeys = await db.get(`keys`)
        await interaction.reply({ content: allkeys ? `**Aktif Keyler**\n\`\`\`${Object.entries(allkeys).map(([key, info]) => ({key, amount: info[0].amount, type: info[0].type })).slice(0, 30).map(l => `${l["key"]} - ${l["amount"]} ${l["type"]}`).join("\n")}\`\`\`` : `\`\`\`Veritabanında hiç key bulunmamakta!\`\`\``, ephemeral: true });
    }

    if (interaction.commandName === 'yazdir') {
        if(!config["admins"].includes(interaction.user.id)) return await interaction.reply({ content: "Bu komut için yeterli iznin yok!"})
        const limit = interaction.options.getInteger('limit')
        const sfilter = interaction.options.getString('filter')
        const allkeys = await db.get(`keys`)
        if(sfilter) {
            const filtered = Object.entries(allkeys).map(([key, info]) => ({key, name: `${info[0].amount} ${info[0].type}` })).filter(x => x.name == sfilter)
            let content = limit ? filtered.slice(0, limit).map(l => `${l["key"]}`).join("\n") : filtered.map(l => `${l["key"]}`).join("\n")
            fs.writeFileSync('keys.txt', content, 'utf-8');
            await interaction.reply({ files: [{ attachment: 'keys.txt', name: 'keys.txt' }], ephemeral: true }).then(r => {
                fs.unlinkSync('keys.txt');
            });
        } else {
            const normal = Object.entries(allkeys).map(([key, info]) => ({key}))
            console.log(normal)
            let content2 = limit ? normal.slice(0, limit).map(l => `${l["key"]}`).join("\n") : normal.map(l => `${l["key"]}`).join("\n")
            fs.writeFileSync('keys.txt', content2, 'utf-8');
            await interaction.reply({ files: [{ attachment: 'keys.txt', name: 'keys.txt' }], ephemeral: true }).then(r => {
                fs.unlinkSync('keys.txt');
            });
        }
    }
    
    if (interaction.commandName === 'key-üret') {
        if(!config["admins"].includes(interaction.user.id)) return await interaction.reply({ content: "Bu komut için yeterli iznin yok!", ephemeral: true })
        const miktar = interaction.options.getInteger('miktar')
        const paket = interaction.options.getString('paket')
        const multi = interaction.options.getInteger('multi')
        if(!multi) {
            const new_key = generator.generate({ length: 12, numbers: false })
            await interaction.reply({ content: `**${miktar} ${paket}**\n\`\`\`${new_key}\`\`\``, ephemeral: true });
            await db.push(`keys.${new_key}`, { amount: miktar, type: paket });
        } else {
            const new_keys = generator.generateMultiple(multi, { length: 12, numbers: false });
            for (const key of new_keys) {
                await db.push(`keys.${key}`, { amount: miktar, type: paket });
            }
            await interaction.reply({ content: `**${miktar} ${paket}**\n\`\`\`${new_keys.map(k => k).join("\n")}\`\`\``, ephemeral: true });
        }
    }
    
    if (interaction.commandName === 'key-sil') {
        if(!config["admins"].includes(interaction.user.id)) return await interaction.reply({ content: "Bu komut için yeterli iznin yok!", ephemeral: true })
        const key = interaction.options.getString('key')
        if(key == "all") {
            const allkeys = await db.get(`keys`)
            if(!allkeys) {
                await interaction.reply({ content: `Veritabanında key bulunmamakta!`, ephemeral: true });
                return;     
            } 
            await db.delete(`keys`);
            await interaction.reply({ content: `Bütün keyler veritabanından silindi.`, ephemeral: true });
        } else {
            const isKey = await db.get(`keys.${key}`);
            if(isKey) {
                await db.delete(`keys.${key}`);
                await interaction.reply({ content: `Bu key veritabanından silindi.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `Böyle bir key veritabanımda bulunmuyor.`, ephemeral: true });
                return;
            }
        }
    }
})

client.login(config["token"]).catch(e => {
    console.log(`Gecersiz token: ${token}`)
});