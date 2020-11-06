// const ytdl = require('ytdl-core');
const ytdl = require('ytdl-core-discord');
var dispatcher = null;
var queue = [];
var playing = false;
var songTitle = "";
var lastSong = null;

function SendToClient(clients, message) {
    clients.forEach((client) => {
        client.sendUTF(message);
    });
}

function PlaySong(clients, text_channel, audio_channel, response){
    try{
        var id = response.data.items[0].id.videoId;
        var islive = response.data.items[0].snippet.liveBroadcastContent === 'live'; //check if requested video is a livestream, which uses a different ptag
        songTitle = FilterTitle(response.data.items[0].snippet.title);
    }
    catch(error){
        console.error("Error in reading response", error);
        return -1;
    }
    lastSong = response;
    audio_channel.join().then(async(connection) => {
            url = 'https://www.youtube.com/watch?v=' + id;
        try{
            stream = ytdl(url, 
            islive ? { quality: [128,127,120,96,95,94,93] } : {highWaterMark: 1<<25, filter: 'audioonly'});
            dispatcher = await connection.play(await stream, {highWaterMark: 1, type: 'opus'});
        }
        catch (error){
            text_channel.send("I errored out lmao oops, \n" + error)
            text_channel.send("Clearing queue and stopping playback. you can add more songs now")
            console.error("Error in streaming", error)
            PlayingFalse();
            QueueClear();
            StopSong(audio_channel);
            return;
        }
        
        console.log("Now Playing: " + songTitle);
        text_channel.send("Now playing **" + songTitle + "**");

        dispatcher.on('finish', ()=>{
            queue.shift(); //pops first item off
            console.log('Queue Length: ' + queue.length);
            if(queue.length == 0) //queue is empty
            {
                PlayingFalse();
                SendToClient(clients, "Nothing");
                console.log('Finished playing');
                // text_channel.send("Finished playing");
                audio_channel.leave();
            }
            else //more songs to play
            {
                console.log('Next song');
                SendToClient(clients, FilterTitle(queue[0].data.items[0].snippet.title));
                PlaySong(clients, text_channel, audio_channel, queue[0]);
            }
        });

        dispatcher.on('error', console.error); //error listener
    })
}

function PauseSong(text_channel){
    if(dispatcher!=null)
    {
        dispatcher.pause();
        console.log('Pausing');
        text_channel.send("Ok, I'm pausing");
    }
    else{
        console.log("Request to pause ignored since nothing's playing");
    }
}

function UnpauseSong(text_channel){
    if(dispatcher!=null && dispatcher.paused)
    {
        dispatcher.resume();
        console.log("Unpausing");
        text_channel.send("Resuming");
        return 1;
    }
    return 0;
}

function StopSong(audio_channel){
    if(dispatcher!=null)
    {
        dispatcher.end();
        dispatcher = null;
        if(queue.length == 0)
        {
            console.log("Bot disconnecting");
            // text_channel.send("Bye bitches");
            audio_channel.leave();
        }
    }
}

function SkipSong(text_channel, audio_channel){
    if(dispatcher!=null && !dispatcher.paused)
    {
        console.log("Skipping");
        text_channel.send("Okay, skipping song");
        StopSong(text_channel, audio_channel);
    }
    else
    {
        console.log("Request to skip ignored since nothing's playing");
    }
}

function ShowQueue(text_channel){
    console.log("Printing Queue");
    if(queue.length <= 1)
    {
        text_channel.send("Queue's empty");
        return;
    }
    text_channel.send("The Current Queue is: ");
    q = ""
    for(var i = 1; i < queue.length; i++)
    {
        q = q + i + ": " + FilterTitle(queue[i].data.items[0].snippet.title) + "\n";
    }
    text_channel.send(q)
}

function RemoveSong(text_channel, audio_channel, num){
    if(num < 0 || num >= queue.length)
    {
        text_channel.send("Number out of range, failed to remove");
        return;
    }
    console.log("Removing item " + num + " from queue");
    text_channel.send("Removing " + FilterTitle(queue[num].data.items[0].snippet.title) + " from queue");

    if(num == queue.length - 1) //last item
    {
        queue.pop();
    }
    else
    {
        queue.splice(num, 1);
    }
}

function FilterTitle(title){
    var res = title.replace(/&#39;/gi, "'");
    res = res.replace(/&amp;/gi, "&");
	res = res.replace(/&quot;/gi, "\"");
    return res;
}

function QueueAdd(response){
    queue.push(response);
}

function QueueLength(){
    return queue.length;
}

function QueueClear(){
    queue = [];
}

function GetQueue(){
    return queue;
}

function SetQueue(newQueue){
    queue = newQueue;
}

function PlayingTrue(){
    playing = true;
}

function PlayingFalse(){
    playing = false;
}

function Playing(){
    return playing;
}

function SetSongTitle(newTitle){
    songTitle = newTitle;
}

function GetSongTitle(){
    return songTitle;
}

function GetLastSong(){
    return lastSong;
}

function GetPaused(){
    return dispatcher!=null && dispatcher.paused;
}

function ChooseRandom(list){
    return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
    SendToClient, PlaySong, PauseSong, UnpauseSong, StopSong, SkipSong, FilterTitle, QueueAdd, QueueLength, QueueClear,
    PlayingTrue, PlayingFalse, Playing, SetSongTitle, GetSongTitle, GetLastSong, ShowQueue, RemoveSong, GetPaused, GetQueue, SetQueue,
    ChooseRandom
};