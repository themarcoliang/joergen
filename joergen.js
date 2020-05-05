const fs = require('fs');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const {google} = require('googleapis');
// const {authenticate} = require('@google-cloud/local-auth');

var dispatcher = null;
var channel = null;
var playing = false;
var latestMessage = null;

const keys = JSON.parse(fs.readFileSync('./keys.json'));
const TOKEN = keys.discord_token;
const YT_KEY = keys.yt_key;

const Youtube = google.youtube({
    version: 'v3',
    auth: YT_KEY
});
const client = new Discord.Client();

function playVideo(id, islive){
    // console.log('videoId: ' + id);
    channel = latestMessage.member.voice.channel;
    // const stream = ytdl('https://www.youtube.com/watch?v=' + id, {filter: 'audioonly'});
    
    channel.join().then((connection) => {
        let stream = ytdl('https://www.youtube.com/watch?v=' + id, islive ? { quality: [128,127,120,96,95,94,93] } : {highWaterMark: 1<<25, filter: 'audioonly' });
        dispatcher = connection.play(stream, {highWaterMark: 1});
        playing = true;
        dispatcher.on('finish', ()=>{
            console.log('Finished playing');
            playing = false;
            // dispatcher.destroy();
            channel.leave();
        });
        dispatcher.on('error', console.error);
    }).catch(function(err){
        console.error("Unexpected error with voice channel", err);
    });
    // dispatcher.destory();
}

function stopPlaying()
{
    if(!playing){
        latestMessage.reply('nothing is playing!');
        return;
    }
    else{
        dispatcher.pause();
        latestMessage.channel.send(`K I'm stopping`);
        console.log('Stopping playback');
        channel.leave();
        playing = false;
    }
}

client.on('ready', ()=> {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', function (msg) {
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
        // console.log(arg);
        if(arg === 'play')
        {
            const query = split_message.slice(2).join(' ');
            return Youtube.search.list({
                        "part": "snippet",
                        "q" : query,
                        "type": "video",
                    }).then(function(response){
                        playVideo(response.data.items[0].id.videoId, response.data.items[0].snippet.liveBroadcastContent === "live");
                        latestMessage.channel.send(`Playing ${response.data.items[0].snippet.title}`);
                        console.log(`Ok, I'll play ${response.data.items[0].snippet.title}!`);
                    }).catch(function(err){
                        console.error("Unexpected error", err);
                    });
        }
        else if(arg == 'stop')
        {
            // console.log('stopping');
            stopPlaying();
        }
        else if(arg == 'pause')
        {
            console.log('pausing');
        }

    }
});

client.login(TOKEN);