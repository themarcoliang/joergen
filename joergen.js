const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();

var keys = JSON.parse(fs.readFileSync('./keys.json'));

const TOKEN = keys.token;

client.on('ready', ()=> {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    const message = msg.content.toLowerCase();
    const split_message = message.split(' ');
    if(message.startsWith('joergen') && split_message.length > 1) //only care if message starts with joergen and has more than one word
    {
        const arg = split_message.slice(1,2).join(' ');
        // console.log(arg);
        if(arg === 'play')
        {
            console.log('playing');
        }
        else if(arg == 'stop')
        {
            console.log('stopping');
        }

    }
});

client.login(TOKEN);