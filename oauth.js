const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const DiscordOAuth2 = require('discord-oauth2');
const config = require('./config.json');
const app = express();

const client = new DiscordOAuth2({
  clientId: config["clientID"],
  clientSecret: config["clientSecret"],
  redirectUri: 'http://localhost:8080/oauth2',
});

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/oauth2', async (req, res) => {
  try {

    const exchangeResponse = await fetch(`https://discord.com/api/oauth2/token`, {
        method: 'POST',
        body: new URLSearchParams({
          client_id: config["clientID"],
          client_secret: config["clientSecret"],
          code: req.query.code,
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:8080/oauth2',
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    const exchangeData = await exchangeResponse.json()

    res.status(200).json(exchangeData);
  } catch (error) {
    console.log(error)
    res.status(500).send('An error occurred.');
  }
});

app.listen(8080, () => {
  //console.log('Server is running on http://localhost:8080');
});
