const {google} = require('googleapis');
const fs = require('fs');

const keys = JSON.parse(fs.readFileSync('./keys.json'));

//Initializes Youtube API
const Youtube = google.youtube({
    version: 'v3',
    auth: keys.yt_key
});

async function QueryYoutube(query){
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

module.exports = {
    QueryYoutube
};