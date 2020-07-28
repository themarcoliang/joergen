const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const {google} = require('googleapis');
// const dgram = require('dgram');
// const server = dgram.createSocket('udp4');

const port = 690;
const websocketserver = require('websocket').server;
const http = require('http');
const socket = http.createServer();
socket.listen(port);
const wsServer = new websocketserver({
    httpServer: socket
});


wsServer.on('request', (request) => {
    console.log("New Connection from " + request.remoteAddress);
    const connection = request.accept(null, request.origin);
    clients.push(connection);
    // console.log(clients)
    if(playing){
        connection.sendUTF(videoTitle);
    }
    else {
        connection.sendUTF("Nothing");
    }

    connection.on('message', function(message){
        if (message.type === 'utf8') {
            const dataFromClient = JSON.parse(message.utf8Data);
            console.log(dataFromClient.identifier);
            iOS_request(dataFromClient);
        }
    })
    connection.on('close', () => {
        console.log("connection closed by client");
        let clientIndex = clients.indexOf(connection);
        // console.log(connection)
        if(clientIndex != -1)
        {
            clients.splice(clientIndex, 1);
        }
        // console.log(clients)
    })

})


const keys = JSON.parse(fs.readFileSync('./keys.json'));
const TOKEN = keys.discord_token;
const YT_KEY = keys.yt_key;

const Youtube = google.youtube({
    version: 'v3',
    auth: YT_KEY
});
const client = new Discord.Client();

var dispatcher = null;
var channel = null;
var latestMessage = null;
var queue = [];
var clients = [];
var playing = false;
var videoTitle = "";
// server.bind(420);
client.login(TOKEN);

// server.on('error', (err) => {
//     console.log(`server error:\n${err.stack}`);
//     server.close();
// });

// server.on('message', async (cmd, rinfo) => {
//     console.log(`server got a command from ${rinfo.address}:${rinfo.port}`);
//     var command = JSON.parse(cmd)
//     console.log(command.identifier)
    
// });

// server.on('listening', () => {
//     const address = server.address();
//     console.log(`server listening ${address.address}:${address.port}`);
// });

function sendToClient(message) {
    // Object.keys(clients).map((i) => {
    //     clients[i].sendUTF(message);
    // });
    clients.forEach((client) => {
        client.sendUTF(message);
        // console.log("Send message");
    });
}

async function iOS_request(command){
    switch (command.identifier){
        case 'unpause':
            if(dispatcher != null && dispatcher.paused)
            {
                playing = true;
                dispatcher.resume();
                sendToClient(videoTitle);
                console.log('Resuming (iOS)');
                if(latestMessage != null){
                    latestMessage.channel.send('Resuming cuz Siri told me to');
                }
            }
            break;

        case "pause":
            pauseVideo();
            break;

        case "skip":
            if(dispatcher != null && !dispatcher.paused)
            {
                console.log('Skipping');
                if(latestMessage != null){
                    latestMessage.channel.send('Skipping cuz Siri told me to');
                }
                stopVideo();
            }
            break;

        case "stop":
            queue = []; //clear queue
            console.log('Stopping');
            stopVideo();
            break;
        
        case "play":
            query = command.argument;
            console.log(command.argument);
            if(queue.length == 0) //empty queue
            {
                let response = await getResponse(query);
                queue.push(response);
                playVideo(response);
                if(latestMessage != null){
                    // latestMessage.channel.send("Siri just told me to play **" + response.data.items[0].snippet.title + "**");
                }
                else{
                    client.channels.fetch('527041342212407296').then((channel)=>{
                        // channel.send("Siri just told me to play **" + response.data.items[0].snippet.title + "**");
                    }).catch((error)=>{
                        console.error("Failed to get channel ", error);
                        return;
                    })
                }
            }
            else { //non-empty queue
                let response = await getResponse(query);
                queue.push(response);
                console.log("Queuing song, queue length: " + queue.length);
                if(latestMessage != null){
                    latestMessage.channel.send("Queuing " + filterTitle(response.data.items[0].snippet.title) + " for later because Siri told me to");
                }
                else{
                    client.channels.fetch('527041342212407296').then((channel)=>{
                        channel.send("Queuing " + filterTitle(response.data.items[0].snippet.title) + " for later because Siri told me to");
                    }).catch((error)=>{
                        console.error("Failed to get channel ", error);
                        return;
                    })
                }
            }
            break;
        default: 
            console.log("Unknown Command from iOS!")
            break;
    }
}

function filterTitle(title){
    var res = title.replace(/&#39;/gi, "'");
    res = res.replace(/&amp;/gi, "&");
	res = res.replace(/&quot;/gi, "\"");
    return res;
}

//Function to pull video data from YouTube
async function getResponse(query){
    try {
        return await Youtube.search.list({
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": 1
        })}
    catch (err) {
        console.error("Unexpected error", err);
        return;
    }
}

//Function to stream a video, based on response from YouTube API
async function playVideo(response){
    try{
        if(latestMessage == null)
        {
            channel = await client.channels.fetch('287885534800510977').catch((error)=>{
                console.error("Cannot find channel", error);
                return;
            });
        }
        else
        {
            channel = latestMessage.member.voice.channel;
        }
        
        var id = response.data.items[0].id.videoId;
        var islive = response.data.items[0].snippet.liveBroadcastContent === 'live'; //check if requested video is a livestream, which uses a different ptag
        videoTitle = filterTitle(response.data.items[0].snippet.title);
        sendToClient(String(videoTitle));
    }
    catch(error){
        console.error("Unexpected Response",error);
        return;
    }
        
    channel.join().then((connection) => {
        let stream = ytdl('https://www.youtube.com/watch?v=' + id, islive ? { quality: [128,127,120,96,95,94,93] } : {highWaterMark: 1<<25, filter: 'audioonly' });
        try{
            dispatcher = connection.play(stream, {highWaterMark: 1});
        }catch(err){
            console.error(err);
            return;
        }
        console.log("Playing " + videoTitle);
        playing = true;
        if(latestMessage!=null){
            latestMessage.channel.send("Ok, I'll play **" + videoTitle + "**");
        }
        else
        {
            client.channels.fetch('527041342212407296').then((channel)=>{
                channel.send("Ok Siri, I'll play **" + videoTitle + "**");
            }).catch((error)=>{
                console.error("Failed to get Channel: ", error);
                return;
            })
        }
        
        //eventlistener that checks for dispatcher's finish event
        dispatcher.on('finish', ()=>{
            queue.shift(); //pops first item off
            console.log('Queue Length: ' + queue.length);
            if(queue.length == 0) //queue is empty
            {
                playing = false;
                sendToClient("Nothing");
                console.log('Finished playing');
                channel.leave();
            }
            else //more songs to play
            {
                console.log('Next song');
                playVideo(queue[0]);
            }
        });
        
        dispatcher.on('error', console.error); //error listener
    }).catch(function(err){
        console.error("Unexpected error when joining voice channel", err);
    });
}

//Function to pause player
function pauseVideo(){
    if(dispatcher!=null)
    {
        playing = false;
        dispatcher.pause();
        sendToClient("OFF");
        if(latestMessage!=null)
        {
            latestMessage.channel.send("K I'm pausing");
        }
        console.log('Pausing playback');
    }
    else if(latestMessage!=null){
        latestMessage.reply("nothing's playing dude");
    }
}
        

//Function to stop currently playing video, and exit voice channel if queue is empty
function stopVideo(){
    if(dispatcher!=null)
    {
        dispatcher.end();
        dispatcher = null;
        if(queue.length == 0)
        {
            console.log("Bot disconnecting");
            playing = false;
            if(latestMessage!=null)
            {
                latestMessage.channel.send("K bye");
            }
            channel.leave();
        }
    }
}

function verifyChannel(){
    if(!latestMessage.member.voice.channel)  //check if user is in a voice channel (required)
    {
        latestMessage.reply('you must be in a voice channel to do that!');
        console.log('Failed to play: user not in a voice channel');
        return false;
    }
    return true;
}

//Joergen is ready
client.on('ready', async ()=> {
    console.log(`Logged in as ${client.user.tag}!`);
});

//Message received
client.on('message', async function (msg) {
    // console.log("message received");
    if(!msg.author.bot) //only care if not from bot
    {
        latestMessage = msg;
        const message = latestMessage.content.toLowerCase();
        const split_message = message.split(' ');
        const arg = split_message.slice(0,1).join(' '); //get arguments for joergen
        //console.log(arg);
        if(arg === '!play')
        {
            if(!verifyChannel()) return;
            const query = split_message.slice(1).join(' ');
            
            if(query=='') //if no query is provided
            {
                if(dispatcher==null || !dispatcher.paused) //player's not paused
                {
                    latestMessage.reply("you gotta tell me what to play smh");
                    return;
                }
                else //player's paused
                {
                    sendToClient(videoTitle)
                    playing = true;
                    dispatcher.resume();
                    console.log('Resuming');
                    latestMessage.channel.send('K, resuming');
                    return;
                }
                
            }
            else if(queue.length == 0) //empty queue
            {
                let response = await getResponse(query);
                queue.push(response);
                playVideo(response);
            }
            else { //non-empty queue
                let response = await getResponse(query);
                queue.push(response);
                console.log("Queuing song, queue length: " + queue.length);
                latestMessage.channel.send("Something's playing already, I'll queue " + filterTitle(response.data.items[0].snippet.title) + " for later");
            }
        }
        else if(arg == '!pause')
        {
            if(!verifyChannel()) return;
            console.log('Pausing');
            pauseVideo();
        }
        else if(arg == '!stop')
        {
            if(!verifyChannel()) return;
            queue = []; //clear queue
            console.log('Stopping');
            latestMessage.channel.send('K, stopping...');
            stopVideo();
        }
        else if(arg == '!skip')
        {
            if(!verifyChannel()) return;
            if(dispatcher==null || dispatcher.paused)
            {
                latestMessage.reply("nothing is playing though");
            }
            else
            {
                console.log('Skipping');
                latestMessage.channel.send('K, skipping...');
                stopVideo();
            }
        }
    }
});