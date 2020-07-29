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

var queue = [];
var playing = false;
var dispatcher = null;
var songTitle = "";
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
            if(dispatcher!=null && dispatcher.paused)
            {
                helpers.SendToClient(clients, songTitle);
                playing = true;
                dispatcher.resume();
                console.log("Unpausing");
                text_channel.send("Resuming");
                return;
            }

            const query = split_message.slice(1).join(' ');
            if(query=='') //if no query given
            {
                msg.reply("you gotta tell me what to play smh");
                return;
            }
            
            let response = await yt.QueryYoutube(query);
            queue.push(response);

            if(queue.length == 1) //only song in queue
            {
                result = await helpers.PlaySong(queue, audio_channel, text_channel, response);
                if(result == -1){
                    return;
                }
                else
                {
                    dispatcher = result;
                }
            }
            else
            {
                console.log("Queuing " + helpers.FilterTitle(response.data.items[0].snippet.title) + ", queue length: " + queue.length);
                text_channel.send("Queued " + helpers.FilterTitle(response.data.items[0].snippet.title) + " for later");
            }
            break;
        case("!pause"):
            text_channel = msg.channel;
            helpers.PauseSong(text_channel, dispatcher);
            break;
        case("!stop"):
            text_channel = msg.channel;
            text_channel.send("Ok, goodbye");
            console.log("Stopping")
            queue = [];
            helpers.StopSong(text_channel, dispatcher);
            break;
        case("!skip"):
            text_channel = msg.channel;
            helpers.SkipSong(text_channel, dispatcher);
            break;
        default:
            break;
    }
});

//WebSocket Initialization

const port = 690;
const websocketserver = require('websocket').server;
const http = require('http');
const socket = http.createServer();
socket.listen(port);
const wsServer = new websocketserver({
    httpServer: socket
});
var clients = [];


//Listens for new requests
wsServer.on('request', (request) => {
    console.log("New Connection from " + request.remoteAddress);
    const connection = request.accept(null, request.origin);
    clients.push(connection);
    // console.log(clients)
    if(playing){
        connection.sendUTF(songTitle);
    }
    else {
        connection.sendUTF("Nothing");
    }

    connection.on('message', function(message){
        if (message.type === 'utf8') {
            const dataFromClient = JSON.parse(message.utf8Data);
            console.log("Received Command: " + dataFromClient.identifier);
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
            if(dispatcher != null && dispatcher.paused)
            {
                playing = true;
                dispatcher.resume();
                sendToClient(songTitle);
                console.log("Unpausing [iOS]");
                if(latestMessage != null){
                    latestMessage.channel.send("Received request from Siri");
                }
            }
            break;

        case "pause":
            if(dispatcher != null){
                helpers.PauseSong(text_channel, dispatcher);
                console.log("Pausing [iOS]");
                text_channel.send("Received request from Siri");
            }
            break;

        case "skip":
            if(dispatcher != null && !dispatcher.paused)
            {
                helpers.SkipSong(text_channel, dispatcher);
                console.log("Skipping [iOS]");
                text_channel.send("Received request from Siri");
            }
            break;

        case "stop":
            if(dispatcher != null)
            {
                queue = []; //clear queue
                helpers.StopSong(text_channel, dispatcher);
                console.log("Stopping [iOS]");
                text_channel.send("Received request from Siri");
            }
            break;
        
        case "play":
            query = command.argument;
            console.log("Playing [iOS]");
            
            let response = await yt.QueryYoutube(query);
            queue.push(response);

            if(queue.length == 1) //only song in queue
            {
                result = await helpers.PlaySong(queue, audio_channel, text_channel, response);
                if(result == -1){
                    return;
                }
                else
                {
                    dispatcher = result;
                }
            }
            else
            {
                console.log("Queuing " + helpers.FilterTitle(response.data.items[0].snippet.title) + ", queue length: " + queue.length);
                text_channel.send("Queued " + helpers.FilterTitle(response.data.items[0].snippet.title) + " for later");
            }
            break;
        default: 
            console.log("Unknown Command from iOS!")
            break;
    }
}
