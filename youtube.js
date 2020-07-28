const {google} = require('googleapis');
const fs = require('fs');

const keys = JSON.parse(fs.readFileSync('./keys.json'));

//Initializes Youtube API
const Youtube = google.youtube({
    version: 'v3',
    auth: keys.yt_key
});

async function QueryYoutube(query){
    // try {
    //     return await Youtube.search.list({
    //         "part": "snippet",
    //         "q": query,
    //         "type": "video",
    //         "maxResults": 1
    //     })}
    // catch (err) {
    //     console.error("Unexpected error", err);
    //     return;
    // }

    //TODO: stop using this hardcoded result
    return {
            "kind": "youtube#searchListResponse",
            "etag": "bUjKFgJ92RML5e9lVfcgy_MhyaA",
            "nextPageToken": "CAEQAA",
            "regionCode": "CA",
            "pageInfo": {
              "totalResults": 1000000,
              "resultsPerPage": 1
            },
            "data": {
                "items": [
                    {
                      "kind": "youtube#searchResult",
                      "etag": "YQP5sZXJyLXe-Pze-DkDCQl5RXI",
                      "id": {
                        "kind": "youtube#video",
                        "videoId": "wKyMIrBClYw"
                      },
                      "snippet": {
                        "publishedAt": "2018-01-29T15:00:07Z",
                        "channelId": "UCnCEKlzi52Yzj2JdBFhKVEA",
                        "title": "DEAN - instagram",
                        "description": "'instagram' is available wherever you are https://UniversalMusicKorea.lnk.to/margatsni lyrics by Deanfluenza composed by Deanfluenza, highhopes arranged ...",
                        "thumbnails": {
                          "default": {
                            "url": "https://i.ytimg.com/vi/wKyMIrBClYw/default.jpg",
                            "width": 120,
                            "height": 90
                          },
                          "medium": {
                            "url": "https://i.ytimg.com/vi/wKyMIrBClYw/mqdefault.jpg",
                            "width": 320,
                            "height": 180
                          },
                          "high": {
                            "url": "https://i.ytimg.com/vi/wKyMIrBClYw/hqdefault.jpg",
                            "width": 480,
                            "height": 360
                          }
                        },
                        "channelTitle": "DEANTRBL",
                        "liveBroadcastContent": "none",
                        "publishTime": "2018-01-29T15:00:07Z"
                      }
                    }
                  ]
                }
          }
};

module.exports = {
    QueryYoutube
};