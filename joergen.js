const helpers = require("./helpers.js");
const yt = require("./youtube.js");
const fs = require('fs');

//Requests coming in from Discord

//Imports keys from keys.json
const keys = JSON.parse(fs.readFileSync('./keys.json'));
const allowedIP = JSON.parse(fs.readFileSync('./ips.json'))

//Initializes Discord Client
const Discord = require('discord.js');
const { client } = require("websocket");
const { exit } = require("process");
const discord_client = new Discord.Client();
discord_client.login(keys.discord_token);

//Profanity filter
// var Filter = require('bad-words');
// var filter = new Filter();

var clients = [];
var audio_channel = null;
var text_channel = null;

//help message
const help_message = new Discord.MessageEmbed()
    .setTitle('Commands list')
    .setColor('#f723cd')
    .addFields({
        name: 'To play a song',
        value:`!play [name of song/youtube link]`
    })
    .addFields({
        name: 'To remove a song',
        value:`!remove [number of the song you want to remove from queue]`
    })
    .addFields({
        name: 'To show the current queue',
        value:`!queue`
    })
    .addFields({
        name: 'To pause',
        value:`!pause`
    })
    .addFields({
        name: 'To unpause',
        value:`!play`
    })
    .addFields({
        name: 'To skip the current song',
        value:`!skip`
    })
    .addFields({
        name: 'To replay the current song, or the last played if nothing is playing',
        value:`!replay`
    })
    .addFields({
        name: 'To stop me completely (pls don\'t)',
        value:`!stop`
    });

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
    text_channel.send("I'm on bitches");
})

discord_client.on('message', async (msg) => {
    //ignore bot messages
    if(msg.author.bot){
        return;
    }

    if(msg.author.username == "Mamothy"){
        text_channel = msg.channel;
        helpers.PlayingFalse();
        helpers.QueueClear();
        console.log("Stopping");
        helpers.StopSong(audio_channel);
        let response = await yt.QueryYoutube("niggas in my butthole");
        newSongTitle = helpers.FilterTitle(response.data.items[0].snippet.title);
        helpers.PlayingTrue();
        helpers.SetSongTitle(newSongTitle);
        helpers.PlaySong(clients, text_channel, audio_channel, response);
        text_channel.send("Aight bet");
        return;
    }

    if(helpers.GetPaused())
    {
        text_channel.send("I'm paused btw");
    }

    const split_message = msg.content.toLowerCase().split(' ');
    switch(split_message.slice(0,1).join(' ')){
        case("!play"):
            if(msg.member.voice.channel)
            {
                audio_channel = msg.member.voice.channel;
            }
            text_channel = msg.channel;

            let query = split_message.slice(1).join(' ');
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
                query = query.split('&')[0]; //remove everything after & in links
                let response = await yt.QueryYoutube(query);
                // console.log(response);
                try{
                    newSongTitle = helpers.FilterTitle(response.data.items[0].snippet.title);
                }
                catch(err){
                    text_channel.send("wtf did you say?");
                    break;
                }
                helpers.QueueAdd(response);
                helpers.SendQueue(clients);
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
            helpers.StopSong(audio_channel);
            helpers.SendQueue(clients);
            break;
        case("!skip"):
            text_channel = msg.channel;
            helpers.SkipSong(text_channel, audio_channel);
            helpers.SendQueue(clients);
            break;
        case("!replay"):
            text_channel = msg.channel;
            if(msg.member.voice.channel)
            {
                audio_channel = msg.member.voice.channel;
            }
            text_channel = msg.channel;
            let response = helpers.GetLastSong();
            if (response == null){
                msg.reply("Yeah...no");
            }
            else{
                helpers.QueueAdd(response);
                helpers.SendQueue(clients)
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
        case("!queue"):
            text_channel = msg.channel;
            helpers.ShowQueue(text_channel);
            break;
        case("!remove"):
            text_channel = msg.channel;
            const number = split_message.slice(1).join(' ');
            if(helpers.QueueLength() <= 1)
            {
                msg.reply("Remove what the queue is empty bruh")
                break;
            }
            if(number == "" || number == null || !Number.isInteger(parseInt(number)))
            {
                msg.reply("You need to put a valid number bruh u stoopid")
                helpers.ShowQueue(text_channel)
                break;
            }
            helpers.RemoveSong(text_channel, audio_channel, number);
            helpers.SendQueue(clients);
            break;
        case("!help"):
            text_channel.send(help_message);
            break;
        case("!br"):
            if(msg.member.voice.channel)
            {
                audio_channel = msg.member.voice.channel;
            }
            text_channel = msg.channel;
            temp = helpers.GetQueue();
            helpers.PlayingFalse();
            helpers.QueueClear();
            console.log("Stopping");
            helpers.StopSong(audio_channel);
            let resp = await yt.QueryYoutube("fortunate son");
            newSongTitle = helpers.FilterTitle(resp.data.items[0].snippet.title);
            helpers.PlayingTrue();
            helpers.SetSongTitle(newSongTitle);
            helpers.PlaySong(clients, text_channel, audio_channel, resp);
            console.log("New queue length: " + temp.unshift(resp));
            helpers.SetQueue(temp);
            helpers.SendQueue(clients);
            var drop_locationsBr = ["Arsenal" , "Docks", "Runway", "Ruins", "Mines", "Peak", "Beachhead", 
                "Village", "Lagoon", "Airfield", "Fields", "Sub Pen", "Power Plant", "Capital", "Resort"];
            text_channel.send("Drop at **" + helpers.ChooseRandom(drop_locationsBr) + "** fam");
            break;
        case("!rs"):
            if(msg.member.voice.channel)
            {
                audio_channel = msg.member.voice.channel;
            }
            text_channel = msg.channel;
            temp = helpers.GetQueue();
            helpers.PlayingFalse();
            helpers.QueueClear();
            console.log("Stopping");
            helpers.StopSong(audio_channel);
            let resp2 = await yt.QueryYoutube("How far I'll go");
            newSongTitle = helpers.FilterTitle(resp2.data.items[0].snippet.title);
            helpers.PlayingTrue();
            helpers.SetSongTitle(newSongTitle);
            helpers.PlaySong(clients, text_channel, audio_channel, resp2);
            console.log("New queue length: " + temp.unshift(resp2));
            helpers.SetQueue(temp);
            helpers.SendQueue(clients);
            var drop_locationsRs = ["Bioweapons Lab", "Chemical Eng.", "Construction Site", "Decon Zone", 
            "Factory", "Harbor", "Headquarters", "Living Quarters", "Prison Block", "Security Area", "Shore"];
            text_channel.send("Drop at **" + helpers.ChooseRandom(drop_locationsRs) + "** fam");
        case("!move"):
            text_channel = msg.channel;
            let from = parseInt(split_message.slice(1,2))
            let to = parseInt(split_message.slice(2,3))
            let qLength = helpers.QueueLength()
            if(isNaN(from) || isNaN(to))
            {
                text_channel.send("Bruh what are those positions")
                break;
            }
            if(from < 1 || to < 1 || from >= qLength || to >= qLength)
            {
                text_channel.send("Nah fam, I can't move those")
                break;
            }
            if(from == to){
                text_channel.send("They the same songs bro")
                break;
            }
            
            helpers.MoveSongs(from, to)
            text_channel.send("Swapped songs " + from + " and " + to);
            helpers.ShowQueue(text_channel);
            helpers.SendQueue(clients);
            break;
        case("hi"):
            skipAndPlay(msg, "https://www.youtube.com/watch?v=tSSAMUlYuEU")
            break;
        default:
            break;
    }
});

async function skipAndPlay(msg, url) {
    if(msg.member.voice.channel)
    {
        audio_channel = msg.member.voice.channel;
    }
    text_channel = msg.channel;
    temp = helpers.GetQueue();
    helpers.PlayingFalse();
    helpers.QueueClear();
    console.log("Stopping");
    helpers.StopSong(audio_channel);
    let res = await yt.QueryYoutube(url);
    newSongTitle = helpers.FilterTitle(res.data.items[0].snippet.title);
    helpers.PlayingTrue();
    helpers.SetSongTitle(newSongTitle);
    helpers.PlaySong(clients, text_channel, audio_channel, res);
    console.log("New queue length: " + temp.unshift(res));
    helpers.SetQueue(temp);
    helpers.SendQueue(clients);
}
//WebSocket Initialization

var wsServer = null
try{
    const port = 6900;
    const websocketserver = require('websocket').server;
    const http = require('http');
    const socket = http.createServer();
    socket.listen(port);
    wsServer = new websocketserver({
        httpServer: socket
    });    
}
catch(error){
    console.error("Error in listening to socket", error);
    exit;
}

//Listens for new requests from iOS
wsServer.on('request', (request) => {

    console.log(new Date().toLocaleTimeString('en-US', { timeZone: 'Canada/Pacific' }) + " pst - New Connection from " + request.remoteAddress);
    if(typeof request.remoteAddress == 'undefined')
    {
        console.log("Rejected undefined IP Address");
        request.reject(403, "Undefined IP address");
        return;
    }
    
    if (allowedIP.includes(request.remoteAddress) || request.remoteAddress.startsWith("::ffff:192.168.1")){
        const connection = request.accept(null, request.origin);
        clients.push(connection);

        if(helpers.Playing()){
            helpers.SendToClient(clients, helpers.GetSongTitle());
        }
        else {
            helpers.SendToClient(clients, "Nothing");
        }

        helpers.SendQueue(clients)
    
        connection.on('message', function(message){
            if (message.type === 'utf8') {
                const dataFromClient = JSON.parse(message.utf8Data);
                command = dataFromClient.identifier;
                if(command == "play")
                {
                    console.log("Received Command: " + command + " " + dataFromClient.argument);
                }
                else{
                    console.log("Received Command: " + command);
                }
                text_channel.send("**Received a new command from iOS!**");
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
    }
    else
    {
        console.log("Rejected connection from " + request.remoteAddress);
        request.reject(403, "Unrecognized IP address");
        return;
    }
})

wsServer.on('error', (error) => {
    console.error("Error with websocket", error)
});

async function iOS_request(command){
    switch (command.identifier){
        case 'unpause':
            if(helpers.UnpauseSong(text_channel)){
                helpers.SendToClient(clients, helpers.GetSongTitle());
                helpers.SendQueue(clients)
                helpers.PlayingTrue();
            }
            break;

        case "pause":
            helpers.PlayingFalse();
            helpers.PauseSong(text_channel);
            helpers.SendToClient(clients, "Paused");
            helpers.SendQueue(clients)
            break;

        case "skip":
            helpers.SkipSong(text_channel, audio_channel);
            break;

        case "stop":
            helpers.PlayingFalse();
            helpers.QueueClear();
            console.log("Stopping");
            helpers.StopSong(audio_channel);
            helpers.SendQueue(clients)
            break;
        
        case "play":
            query = command.argument;
            let response = await yt.QueryYoutube(query);
            helpers.QueueAdd(response);
            helpers.SendQueue(clients)
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
        case "replay":
            let resp = helpers.GetLastSong();
            if (resp != null){
                helpers.QueueAdd(resp);
                helpers.SendQueue(clients)
                newSongTitle = helpers.FilterTitle(resp.data.items[0].snippet.title);
                if(helpers.QueueLength() == 1) //only song in queue
                {
                    helpers.PlayingTrue();
                    helpers.SetSongTitle(newSongTitle);
                    helpers.PlaySong(clients, text_channel, audio_channel, resp);
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
            console.log("Unknown Command from iOS!")
            break;
    }
}

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error.message);
});