const helpers = require("./helpers.js");
const yt = require("./youtube.js");
const fs = require('fs');

//Requests coming in from Discord

//Imports keys from keys.json
const keys = JSON.parse(fs.readFileSync('./keys.json'));

//Initializes Discord Client
const Discord = require('discord.js');
const { client } = require("websocket");
const discord_client = new Discord.Client();
discord_client.login(keys.discord_token);

var clients = [];
var audio_channel = null;
var text_channel = null;

discord_client.on('ready', async () => {
    audio_channel = await discord_client.channels.fetch(keys.default_audio_channel_id).catch((error)=>{
        console.error("Cannot fetch default audio channel", error);
        return;
    });
    text_channel = await discord_client.channels.fetch(keys.default_text_channel_id).catch((error)=>{
        console.error("Cannot fetch default text channel", error);
        return;
    });
    console.log('Logged in as ' + discord_client.user.tag);
    text_channel.send("`Joergen 2.0 is now online`");
})

discord_client.on('message', async (msg) => {
    //ignore bot messages
    if(msg.author.bot){
        return;
    }
    const split_message = msg.content.toLowerCase().split(' ');
    switch(split_message.slice(0,1).join(' ')){
        case("!play"):
            if(msg.member.voice.channel)
            {
                audio_channel = msg.member.voice.channel;
            }
            text_channel = msg.channel;

            const query = split_message.slice(1).join(' ');
            if(query=='') //if no query given
            {
                if(helpers.UnpauseSong(text_channel)){ //unpaused
                    helpers.SendToClient(clients, helpers.GetSongTitle());
                    helpers.PlayingTrue();
                }
                else{
                    msg.reply("what do you want me to play bitch??");
                }
            }
            else //query for new song
            {
                let response = await yt.QueryYoutube(query);
                helpers.QueueAdd(response);
                newSongTitle = helpers.FilterTitle(response.data.items[0].snippet.title);
                if(helpers.QueueLength() == 1) //only song in queue
                {
                    helpers.PlayingTrue();
                    helpers.SetSongTitle(newSongTitle);
                    helpers.PlaySong(clients, text_channel, audio_channel, response);
                    helpers.SendToClient(clients, helpers.GetSongTitle());
                }
                else //something else playing
                {
                    console.log("Queuing " + newSongTitle + ", queue length: " + helpers.QueueLength());
                    text_channel.send("Queued " + newSongTitle + " for later");
                }
            }
            break;
        case("!pause"):
            text_channel = msg.channel;
            helpers.PlayingFalse();
            helpers.PauseSong(text_channel);
            helpers.SendToClient(clients, "Paused");
            break;
        case("!stop"):
            text_channel = msg.channel;
            helpers.PlayingFalse();
            helpers.QueueClear();
            console.log("Stopping");
            helpers.StopSong(text_channel, audio_channel);
            break;
        case("!skip"):
            text_channel = msg.channel;
            helpers.SkipSong(text_channel, audio_channel);
            break;
        case("!replay"):
            let response = helpers.GetLastSong();
            if (response == null){
                msg.reply("Yeah...no");
            }
            else{
                helpers.QueueAdd(response);
                newSongTitle = helpers.FilterTitle(response.data.items[0].snippet.title);
                if(helpers.QueueLength() == 1) //only song in queue
                {
                    helpers.PlayingTrue();
                    helpers.SetSongTitle(newSongTitle);
                    helpers.PlaySong(clients, text_channel, audio_channel, response);
                    helpers.SendToClient(clients, helpers.GetSongTitle());
                }
                else //something else playing
                {
                    console.log("Queuing " + newSongTitle + ", queue length: " + helpers.QueueLength());
                    text_channel.send("Queued " + newSongTitle + " for later");
                }
            }
            break;
        default:
            break;
    }
});

//WebSocket Initialization

const port = 6900;
const websocketserver = require('websocket').server;
const http = require('http');
const socket = http.createServer();
socket.listen(port);
const wsServer = new websocketserver({
    httpServer: socket
});

//Listens for new requests from iOS
wsServer.on('request', (request) => {
    console.log("New Connection from " + request.remoteAddress);
    const connection = request.accept(null, request.origin);
    clients.push(connection);
    if(helpers.Playing()){
        helpers.SendToClient(clients, helpers.GetSongTitle());
    }
    else {
        helpers.SendToClient(clients, "Nothing");
    }

    connection.on('message', function(message){
        if (message.type === 'utf8') {
            const dataFromClient = JSON.parse(message.utf8Data);
            console.log("Received Command: " + dataFromClient.identifier);
            text_channel.send("Received a new command from Siri!");
            iOS_request(dataFromClient);
        }
    })
    connection.on('close', () => {
        console.log("connection closed by client");
        let clientIndex = clients.indexOf(connection);
        if(clientIndex != -1)
        {
            clients.splice(clientIndex, 1);
        }
    })
})

async function iOS_request(command){
    switch (command.identifier){
        case 'unpause':
            if(helpers.UnpauseSong(text_channel)){
                helpers.SendToClient(clients, helpers.GetSongTitle());
                helpers.PlayingTrue();
            }
            break;

        case "pause":
            helpers.PlayingFalse();
            helpers.PauseSong(text_channel);
            helpers.SendToClient(clients, "Paused");
            break;

        case "skip":
            helpers.SkipSong(text_channel, audio_channel);
            break;

        case "stop":
            helpers.PlayingFalse();
            helpers.QueueClear();
            console.log("Stopping");
            helpers.StopSong(text_channel, audio_channel);
            break;
        
        case "play":
            query = command.argument;
            let response = await yt.QueryYoutube(query);
            helpers.QueueAdd(response);
            newSongTitle = helpers.FilterTitle(response.data.items[0].snippet.title);
            if(helpers.QueueLength() == 1) //only song in queue
            {
                helpers.PlayingTrue();
                helpers.SetSongTitle(newSongTitle);
                helpers.PlaySong(clients, text_channel, audio_channel, response);
                helpers.SendToClient(clients, helpers.GetSongTitle());
            }
            else //something else playing
            {
                console.log("Queuing " + newSongTitle + ", queue length: " + helpers.QueueLength());
                text_channel.send("Queued " + newSongTitle + " for later");
            }
            break;
        default: 
            console.log("Unknown Command from iOS!")
            break;
    }
}