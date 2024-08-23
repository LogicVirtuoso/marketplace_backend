/**
 * @swagger
 *   components:
 *     schemas:
 *       NewRecordLabel:
 *         type: object
 *         required:
 *           - trackId
 *           - companyName
 *           - name
 *           - images
 *           - createdAt
 *         properties:
 *           trackId:
 *             type: string
 *             description: trackId in the spotify.
 *             example: 2Gb4AJYm48ybUxnFxqk7B0
 *           companyName:
 *             type: string
 *             description: company name.
 *             example: sony music.
 *           name:
 *             type: string
 *             description: song name.
 *             example: my house
 *           images:
 *             type: array
 *             items:
 *               type: string
 *             description: images of the track.
 *             example: ["https://spotify/images/1.png", "https://spotify/images/2.png"]
 *           createdAt:
 *             type: string
 *             description: created date.
 *             example: 2017-07-21T17:32:28Z.
 *       RecordLabel:
 *         allOf:
 *           - type: object
 *             properties:
 *                _id:
 *                   type: integer
 *                   description: The auto-generated id of the RecordLabel.
 *                   example: 0
 *           - $ref: '#/components/schemas/NewRecordLabel'
 *
 */

/**
 * @swagger
 *   components:
 *     schemas:
 *       NewAudioFeature:
 *         type: object
 *         required:
 *           - acousticness
 *           - danceability
 *           - energy
 *           - id
 *           - instrumentalness
 *           - key
 *           - liveness
 *           - mode
 *           - speechiness
 *           - tempo
 *           - time_signature
 *           - valence
 *           - genres
 *           - usecases
 *         properties:
 *           acousticness:
 *             type: string
 *             description: acousticness of the song
 *             example: 0.69
 *           danceability:
 *             type: string
 *             description: danceability of the song
 *             example: 0.42.
 *           energy:
 *             type: string
 *             description: energy of the song
 *             example: 0.723
 *           id:
 *             type: string
 *             description: id of the song
 *             example: 6zAiRKvAMlXHxEtyO4yxIO
 *           instrumentalness:
 *             type: string
 *             description: instrumentalness of the song
 *             example: 0.0007
 *           key:
 *             type: string
 *             description: key of the song.
 *             example: 10
 *           liveness:
 *             type: string
 *             description: liveness of the song
 *             example: 0.123
 *           mode:
 *             type: string
 *             description: mode of the song
 *             example: 0
 *           speechiness:
 *             type: string
 *             description: speechiness of the song
 *             example: 0.175
 *           tempo:
 *             type: string
 *             description: tempo of the song
 *             example: 165.03
 *           time_signature:
 *             type: string
 *             description: time_signature of the song
 *             example: 6zAiRKvAMlXHxEtyO4yxIO
 *           valence:
 *             type: string
 *             description: valence of the song
 *             example: 6zAiRKvAMlXHxEtyO4yxIO
 *           genres:
 *             type: array
 *             items:
 *               type: string
 *             description: genres of the song
 *             example: ["pop", "dark pop"]
 *       AudioFeature:
 *         allOf:
 *           - type: object
 *             properties:
 *               _id:
 *                 type: integer
 *                 description: The AudioFeature ID.
 *                 example: 0
 *           - $ref: '#/components/schemas/NewAudioFeature'
 */

const router = require("express").Router();
const {
  getPlaylistsByUser,
  getPlaylistsByOrg,
  saveAudioFeaturesByUserName,
  getMoodByDanceability,
  getMoodByEnergy,
  getMoodByTempo,
  getMoodByValence,
  getAudioByGenres,
  searchByMulti,
  getDataFromSpotify,
  getAvaliableGenres,
  getAlbumsOfArtist,
  getSongsOfAlbum,
  searchTracks,
  searchAlbums,
  getGenresOfArtists,
  getAvatarPathByDisplayname,
} = require("../controller/spotify.js");
const {
  authenticateUser,
  authorizeUserRole,
} = require("../middleware/auth.js");

router.get("/playlists/:sellerName", getPlaylistsByUser);

router.get("/download/:trackId", getDataFromSpotify);

router.get("/saveAudioFeature/:userName", saveAudioFeaturesByUserName);

router.get("/audiofeature/danceability", getMoodByDanceability);

router.get("/audiofeature/energy", getMoodByEnergy);

router.get("/audiofeature/tempo", getMoodByTempo);

router.get("/audiofeature/valence", getMoodByValence);

router.get("/audiofeature/genres/:genre", getAudioByGenres);

router.get("/audiofeature/genres", getAvaliableGenres);

router.get(
  "/org/playlists/:orgName/:pageNumber/:licenseName",
  getPlaylistsByOrg
);

router.post("/filter", searchByMulti);

router.post(
  "/artist-album",
  authenticateUser,
  authorizeUserRole,
  getAlbumsOfArtist
);

router.post(
  "/album-song",
  authenticateUser,
  authorizeUserRole,
  getSongsOfAlbum
);

router.get("/search-track/:albumId/:trackName", searchTracks);

router.get("/search-album/:sellerId/:albumName", searchAlbums);

router.get("/get-genres/:artistsQuery", getGenresOfArtists);

router.post("/get-avatarpath", getAvatarPathByDisplayname);

module.exports = router;
