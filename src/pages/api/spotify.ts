// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import SpotifyWebApi from "spotify-web-api-node"

interface AlbumImages {
  url: string
}

interface AlbumProps {
  images: AlbumImages[];
}

interface ItemProps {
  album: AlbumProps;
  artists: ArtistPropsResponse[];
}

interface ArtistPropsExternalUrl {
  spotify: string;
}

interface ArtistPropsResponse {
  name: string;
  external_urls: ArtistPropsExternalUrl;
}

interface ArtistProps {
  artist_name: string;
  artist_url: string;
}

interface ResponseData {
  is_playing: boolean;
  album_art: string;
  artist: ArtistProps[];
  song_name: string;
  song_url: string;
}

const sApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
})


const spotifyHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  try {
    const refToken = process.env.REFRESH_TOKEN;
    if (refToken) {
      sApi.setRefreshToken(refToken)
    }
    const accessToken = await sApi.refreshAccessToken();
    sApi.setAccessToken(accessToken.body.access_token)
    const state = await sApi.getMyCurrentPlaybackState()
    let resData: ResponseData = {} as ResponseData
    if (state.body.is_playing && state.body.currently_playing_type === "track") {
      resData.is_playing = state.body.is_playing;
      if (state.body.item) {
        let item = state.body.item as ItemProps;
        resData.song_name = state.body.item.name;
        resData.song_url = state.body.item.external_urls.spotify;
        resData.album_art = item.album.images[1].url
        let artists: ArtistProps[] = item.artists.map((artist) => ({
          artist_name: artist.name,
          artist_url: artist.external_urls.spotify,
        }))
        resData.artist = artists;
      }
    } else {
      const recent = await sApi.getMyRecentlyPlayedTracks({ limit: 1 })
      resData.is_playing = false
      resData.song_name = recent.body.items[0].track.name;
      resData.song_url = recent.body.items[0].track.external_urls.spotify;
      resData.album_art = recent.body.items[0].track.album.images[1].url;
      let artists: ArtistProps[] = recent.body.items[0].track.artists.map((artist) => ({
        artist_name: artist.name,
        artist_url: artist.external_urls.spotify,
      }))
      resData.artist = artists
    }
    res.status(200).json(resData);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: "Internal server error" });
  }
}
export default spotifyHandler

