const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const {google} = require('googleapis');
// const {authenticate} = require('@google-cloud/local-auth');

var dispatcher = null;
var channel = null;
var playing = false;
var latestMessage = null;
var queue = [];

const keys = JSON.parse(fs.readFileSync('./keys.json'));
const TOKEN = keys.discord_token;
const YT_KEY = keys.yt_key;

const Youtube = google.youtube({
    version: 'v3',
    auth: YT_KEY
});
const client = new Discord.Client();
client.login(TOKEN);

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
    // data for testing
    // var response = {
            
    // };
    // return response;
}

function playVideo(response){
    // console.log(response.data.items[0].snippet);
    try{
        channel = latestMessage.member.voice.channel;
        var id = response.data.items[0].id.videoId;
        var islive = response.data.items[0].snippet.liveBroadcastContent === 'live';
        var videoTitle = response.data.items[0].snippet.title;
    }
    catch(error){
        console.error(error);
        return;
    }
        
    channel.join().then((connection) => {
        let stream = ytdl('https://www.youtube.com/watch?v=' + id, islive ? { quality: [128,127,120,96,95,94,93] } : {highWaterMark: 1<<25, filter: 'audioonly' });
        try{
            dispatcher = connection.play(stream, {highWaterMark: 1});
            playing = true;
        }catch(err){
            console.error(err);
            return;
        }
        console.log("Playing " + videoTitle);
        latestMessage.channel.send("Ok, I'll play " + videoTitle);

        dispatcher.on('finish', ()=>{
            queue.shift(); //pops first item off
            console.log(queue.length);
            if(queue.length == 0) //queue is empty
            {
                console.log('Finished playing');
                playing = false;
                channel.leave();
            }
            else
            {
                console.log('Next song');
                playVideo(queue[0]);
            }
        });
        
        dispatcher.on('error', console.error);
    }).catch(function(err){
        console.error("Unexpected error with voice channel", err);
    });
}

function pauseVideo(){
    dispatcher.pause();
    latestMessage.channel.send(`K I'm pausing`);
    console.log('Pausing playback');
    playing = false;
}

function stopVideo(){
    playing = false;
    if(dispatcher!=null)
    {
        // console.log("Stopping");
        dispatcher.end();
        dispatcher = null;
        if(queue.length == 0)
        {
            console.log("Bot disconnecting");
            latestMessage.channel.send("I'M LEAVING!!");
            channel.leave();
        }
    }
}

client.on('ready', ()=> {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async function (msg) {
    latestMessage = msg;
    const message = latestMessage.content.toLowerCase();
    const split_message = message.split(' ');
    if(message.startsWith('joergen') && split_message.length > 1) //only care if message starts with joergen and has more than one word
    {
        if(!latestMessage.member.voice.channel)
        {
            latestMessage.reply('you must be in a voice channel to do that!');
            console.log('Failed to play: user not in a voice channel');
            return;
        }
        const arg = split_message.slice(1,2).join(' ');
        if(arg === 'play')
        {
            const query = split_message.slice(2).join(' ');
            
            if(query=='' )
            {
                if(dispatcher==null || !dispatcher.paused) //player's not paused
                {
                    latestMessage.reply("you gotta tell me what to play smh");
                    return;
                }
                else //paused
                {
                    dispatcher.resume();
                    console.log('Resuming');
                    latestMessage.channel.send('K, resuming');
                    playing = true;
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
                latestMessage.channel.send("Something's playing already, I'll queue " + response.data.items[0].snippet.title + " for later");
            }
        }
        else if(arg == 'pause')
        {
            console.log('Pausing');
            pauseVideo();
        }
        else if(arg == 'stop')
        {
            queue = [];
            console.log('Stopping');
            latestMessage.channel.send('K, stopping...');
            stopVideo();
        }
        else if(arg == 'skip')
        {
            if(dispatcher==null || dispatcher.paused)
            {
                latestMessage.reply("Nothing is playing though");
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

