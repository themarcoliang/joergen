const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();

var keys = JSON.parse(fs.readFileSync('./keys.json'));

const TOKEN = keys.token;

client.on('ready', ()=> {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if(msg.content === 'ping'){
        msg.reply('Pong!');
    }
});

client.login(TOKEN);