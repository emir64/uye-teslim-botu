const fetch = require("node-fetch");
const colors = require("colors");
const fs = require("fs");
const config = require("./config.json");
const { raw } = require("body-parser");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
require("./oauth.js")
const build_num = 179882

const headers = {
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US",
    "referer": "https://discord.com/channels/@me",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9011 Chrome/91.0.4472.164 Electron/13.6.6 Safari/537.36",
    "x-debug-options": "bugReporterEnabled",
    "x-discord-locale": "en-US",
    "x-super-properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC45MDExIiwib3NfdmVyc2lvbiI6IjEwLjAuMTkwNDUiLCJvc19hcmNoIjoieDY0Iiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiY2xpZW50X2J1aWxkX251bWJlciI6MTc5ODgyLCJuYXRpdmVfYnVpbGRfbnVtYmVyIjozMDMwNiwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbCwiZGVzaWduX2lkIjowfQ=="
}

async function doOAuth(token) {

    headers["Authorization"] = token
    headers["Content-Type"] = 'application/json'
    
    const params = new URLSearchParams({
        client_id: config["clientID"],
        response_type: 'code',
        redirect_uri: 'http://localhost:8080/oauth2',
        scope: 'identify guilds.join'
    });
    
    const data = {
        permissions: '0',
        authorize: true
    };
    
    try {
        const response = await fetch(`https://discord.com/api/v9/oauth2/authorize?${params}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
    
        if (response.status !== 200) {
            return null;
        }
    
        const responseData = await response.json();
        

        return responseData.location;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}
async function getUser(access_token) {
    headers["Authorization"] = `Bearer ${access_token}`
    const res = await fetch(`https://discord.com/api/v10/users/@me`, {
        method: 'GET',
        headers,
    })

    if (res.status !== 200) {
        return null;
    }
    const data = await res.json();
    return data
}
async function joiner(token, guildID, amount) {
    const location = await doOAuth(token);
    const response = await fetch(`${location}`, { method: "GET" })
    const responseData = await response.json();
    const accessToken = responseData["access_token"]
    const user = await getUser(accessToken)
    const userId = user["id"]
    const username = user["username"]

    const joinRes = await fetch(`https://discord.com/api/v10/guilds/${guildID}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({"access_token": accessToken }),
        headers: {
            "Authorization": `Bot ${config["token"]}`,
            "Content-Type": 'application/json'
        }
    });

    if(joinRes.status == 201) {
        console.log(` ${colors.brightGreen(`[${username}]`)} Joined`)
        return 201;
    } else if(joinRes.status == 403) {
        console.log(` ${colors.brightRed(`The bot is not on the server!`)}`)
        return 403;
    } else if(joinRes.status == 204) { 
        console.log(` ${colors.brightMagenta(`[${username}]`)} Already added`)
        return 204;
    }
}
exports.processTokens = async function(guildID, amount, type) {
    let tokenProcessedCount = 0;
    const maxTokenCount = amount;
    if(type == "Online") {
        const tokens = fs.readFileSync('./stok/online.txt', 'utf-8').split('\n');
        for (const token of tokens) {
            r = await joiner(token.replace("\r",""), guildID, amount);
            if(r == 201) {
                tokenProcessedCount++;
            }
            if (tokenProcessedCount >= maxTokenCount) {
                break;
            }
        }
    } else {
        const tokens = fs.readFileSync('./stok/offline.txt', 'utf-8').split('\n');
        for (const token of tokens) {
            r = await joiner(token.replace("\r",""), guildID, amount);
            if(r == 201) {
                tokenProcessedCount++;
            }
            if (tokenProcessedCount >= maxTokenCount) {
                break;
            }
        }
    }
}
/*/
(async() => {
    console.clear()
    await processTokens()
})()/*/