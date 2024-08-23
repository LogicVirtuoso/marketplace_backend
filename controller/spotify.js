const axios = require("axios");
const fs = require("fs-extra");

const User = require("../model/user");
const RecordLabel = require("../model/recordLabel");
const AudioFeature = require("../model/audioFeature");
const ListedLicenses = require("../model/listedLicenses");
const SpotifyWebApi = require("spotify-web-api-node");
const Spotify = require("spotifydl-core").default;
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const SellerData = require("../model/sellerData");
const { PlatformTypes } = require("../interface");
ffmpeg.setFfmpegPath(ffmpegPath);

const credentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};
const spotify = new Spotify(credentials);

const unique = (value, index, self) => {
  return self.indexOf(value) === index;
};

const getToken = async () => {
  const tokenRes = await axios({
    url: "https://accounts.spotify.com/api/token",
    method: "post",
    params: {
      grant_type: "client_credentials",
    },
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    auth: {
      username: process.env.SPOTIFY_CLIENT_ID,
      password: process.env.SPOTIFY_CLIENT_SECRET,
    },
  });
  const token = tokenRes?.data?.access_token;
  return token;
};

const getTracksByUser = async (userName) => {
  try {
    const token = await getToken();
    if (token) {
      const userRes = await axios({
        url: `https://api.spotify.com/v1/users/${userName}/playlists`,
        method: "get",
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      let tracksArray = [];
      if (userRes?.data?.items?.length > 0) {
        tracksArray = await Promise.all(
          userRes.data.items.map(async (playlist) => {
            try {
              const trackRes = await axios({
                url: `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?market=US`,
                method: "get",
                headers: {
                  Authorization: "Bearer " + token,
                },
              });

              let trackCollection = await Promise.all(
                trackRes?.data?.items?.map(async (item) => {
                  if (item?.track?.id) {
                    const recordById = await RecordLabel.findOne({
                      trackId: item?.track?.id,
                    });
                    const recordByName = await RecordLabel.findOne({
                      name: item?.track?.name,
                    });
                    const listedLicense = await ListedLicenses.findOne({
                      licenseName: item?.track?.name,
                    });
                    if (recordByName || recordById || listedLicense) {
                      return null;
                    } else return item;
                  } else {
                    return null;
                  }
                })
              );
              trackCollection = trackCollection.filter((item) => item !== null);
              return trackCollection;
            } catch (error) {
              return [];
            }
          })
        );
      }
      return {
        accessToken: token,
        tracksArray: tracksArray.filter((item) => item.length > 0).flat(),
      };
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDatabaseByRecordLabel = async () => {
  const limit = 50;
  let offset = 0;
  let result;
  const companies = ["Sony Music", "Warner Music", "Universal Music"];
  const token = await getToken();
  try {
    if (token) {
      await Promise.all(
        companies.map(async (companyName) => {
          do {
            try {
              result = await axios({
                url: `https://api.spotify.com/v1/search?query=${companyName}&type=album&offset=${offset}&limit=${limit}`,
                method: "get",
                headers: {
                  Authorization: "Bearer " + token,
                },
              });
              await delay(60000);
              offset += limit;
              const albumItems = result?.data?.albums?.items;
              await Promise.all(
                albumItems.map(async (item) => {
                  const albumId = item?.id;
                  const albumUrl = `https://api.spotify.com/v1/albums/${albumId}/tracks`;
                  albumRes = await axios({
                    url: albumUrl,
                    method: "get",
                    headers: {
                      Authorization: "Bearer " + token,
                    },
                  });
                  await delay(60000);
                  const tracks = albumRes?.data?.items;
                  let tracksTmp = [];
                  const size = 50;
                  await Promise.all(
                    tracks.map(async (track, idx) => {
                      let spotifyIDs = "";
                      const small = tracks.slice(idx * size, idx * size + size);
                      await Promise.all(
                        small.map((item, idx_small) => {
                          if (idx_small < small.length - 1)
                            spotifyIDs = spotifyIDs + item.id + ",";
                          else spotifyIDs = spotifyIDs + item.id;
                        })
                      );

                      if (spotifyIDs !== "") {
                        trackRes = await axios({
                          url: `https://api.spotify.com/v1/tracks?ids=${spotifyIDs}`,
                          method: "get",
                          headers: {
                            Authorization: "Bearer " + token,
                          },
                        });
                        tracksTmp = [].concat(
                          tracksTmp,
                          trackRes?.data?.tracks
                        );
                      }
                      await delay(60000);
                    })
                  );
                  await Promise.all(
                    tracks.map(async (track) => {
                      const foundItem = tracksTmp.find(
                        (ele) => ele?.id == track?.id
                      );
                      const recordById = await RecordLabel.findOne({
                        trackId: item?.track?.id,
                      });
                      if (!recordById) {
                        await RecordLabel.create({
                          trackId: track?.id,
                          name: track.name,
                          companyName,
                          images: foundItem?.album?.images,
                        });
                      }
                    })
                  );
                })
              );
            } catch (error) {
              console.log(error);
              // break;
            }
          } while (result?.data?.albums?.items?.length > 0);
        })
      );
      console.log("getting RecordLabel from spotify is exited");
    }
  } catch (error) {
    // console.log(error)
  }
};

const getPlaylistsByOrg = async (req, res) => {
  const { orgName, pageNumber, licenseName } = req.params;
  let page = pageNumber;
  if (!pageNumber || pageNumber === 0) {
    page = 1;
  }
  const limit = 3;
  try {
    let playlists = [];
    if (licenseName && licenseName !== "") {
      playlists = await RecordLabel.find({
        companyName: { $regex: orgName, $options: "i" },
        name: { $regex: licenseName, $options: "i" },
      })
        .skip((page - 1) * limit)
        .limit(limit);
    } else {
      playlists = await RecordLabel.find({
        companyName: { $regex: orgName, $options: "i" },
      })
        .skip((page - 1) * limit)
        .limit(limit);
    }
    if (playlists && playlists.length > 0) res.status(200).json(playlists);
    else res.status(404).json("dont have playlists");
  } catch (err) {
    res.status(404).json("something went wrong");
  }
};

const saveAudioFeaturesByUserName = async (req, res) => {
  const { userName } = req.params;
  try {
    const { accessToken, tracksArray } = await getTracksByUser(userName);
    const size = 100;
    let results = [];
    let artists = [];
    let temp = [];

    await Promise.all(
      tracksArray.map(async (track, idx) => {
        track?.track?.artists.map((artist) => {
          artists.push(artist.id);
          temp.push({ sellerId: artist.id, trackId: track?.track?.id });
        });

        let spotifyIDs = "";
        const small = tracksArray.slice(idx * size, idx * size + size);
        await Promise.all(
          small.map((item, idx_small) => {
            if (idx_small < small.length - 1)
              spotifyIDs = spotifyIDs + item.track.id + ",";
            else spotifyIDs = spotifyIDs + item.track.id;
          })
        );
        if (spotifyIDs !== "") {
          const audioRes = await axios({
            url: `https://api.spotify.com/v1/audio-features?ids=${spotifyIDs}`,
            method: "get",
            headers: {
              Authorization: "Bearer " + accessToken,
            },
          });
          results = [].concat(results, audioRes?.data?.audio_features);
        }
      })
    );
    const uniqueArtists = artists.filter(unique);
    const artistSize = 50;
    let genresByArtists = [];
    try {
      await Promise.all(
        uniqueArtists.map(async (ele, idx) => {
          let sellerIds = "";
          const small = uniqueArtists.slice(
            idx * artistSize,
            idx * artistSize + artistSize
          );
          await Promise.all(
            small.map((item, idx_small) => {
              if (idx_small < small.length - 1)
                sellerIds = sellerIds + item + ",";
              else sellerIds = sellerIds + item;
            })
          );

          if (sellerIds !== "") {
            const artistRes = await axios({
              url: `https://api.spotify.com/v1/artists?ids=${sellerIds}`,
              method: "get",
              headers: {
                Authorization: "Bearer " + accessToken,
              },
            });
            genresByArtists = [].concat(
              genresByArtists,
              artistRes?.data?.artists
            );
          }
        })
      );
    } catch (error) {
      console.log(error);
    }
    await Promise.all(
      results?.map(async (audio) => {
        const audioById = await AudioFeature.findOne({ id: audio?.id });
        if (!audioById) {
          const trackById = temp.find((item) => item.trackId === audio?.id);
          const artistById = genresByArtists.find(
            (item) => item.id === trackById?.sellerId
          );
          await AudioFeature.create({
            userName: userName,
            acousticness: audio?.acousticness,
            analysis_url: audio?.analysis_url,
            danceability: audio?.danceability,
            duration_ms: audio?.duration_ms,
            energy: audio?.energy,
            id: audio?.id,
            instrumentalness: audio?.instrumentalness,
            key: audio?.key,
            liveness: audio?.liveness,
            mode: audio?.mode,
            speechiness: audio?.speechiness,
            tempo: audio?.tempo,
            time_signature: audio?.time_signature,
            track_href: audio?.track_href,
            type: audio?.type,
            uri: audio?.uri,
            valence: audio?.valence,
            genres: artistById?.genres,
          });
        }
      })
    );
    if (results && results.length > 0) {
      res.status(200).json(genresByArtists);
    } else {
      res.status(200).json({ msg: "Not found" });
    }
  } catch (error) {}
};

const saveAudioFeaturesByTrackId = async (trackId, artists) => {
  const accessToken = await getToken();
  const audioRes = await axios({
    url: `https://api.spotify.com/v1/audio-features/${trackId}`,
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });
  const audio = audioRes?.data;
  const artistSize = 50;
  let genresByArtists = [];
  try {
    await Promise.all(
      artists.map(async (ele, idx) => {
        let sellerIds = "";
        const small = artists.slice(
          idx * artistSize,
          idx * artistSize + artistSize
        );
        await Promise.all(
          small.map((item, idx_small) => {
            if (idx_small < small.length - 1)
              sellerIds = sellerIds + item?.id + ",";
            else sellerIds = sellerIds + item?.id;
          })
        );

        if (sellerIds !== "") {
          const artistRes = await axios({
            url: `https://api.spotify.com/v1/artists?ids=${sellerIds}`,
            method: "get",
            headers: {
              Authorization: "Bearer " + accessToken,
            },
          });
          genresByArtists = [].concat(
            genresByArtists,
            artistRes?.data?.artists
          );
        }
      })
    );
  } catch (error) {
    console.log(error);
  }
  let genres = [];
  genresByArtists.map((item) => {
    const lower = item?.genres.map((element) => {
      return element.toLowerCase();
    });
    genres = [].concat(genres, lower);
  });
  return {
    acousticness: audio?.acousticness,
    // analysis_url: audio?.analysis_url,
    danceability: audio?.danceability,
    duration_ms: audio?.duration_ms,
    energy: audio?.energy,
    trackId: audio?.id,
    instrumentalness: audio?.instrumentalness,
    key: audio?.key,
    liveness: audio?.liveness,
    mode: audio?.mode,
    speechiness: audio?.speechiness,
    tempo: audio?.tempo,
    time_signature: audio?.time_signature,
    // track_href: audio?.track_href,
    // type: audio?.type,
    // uri: audio?.uri,
    valence: audio?.valence,
    genres: genres,
  };
};

const getMoodByDanceability = async (req, res) => {
  const audio = await AudioFeature.findOne().sort({ danceability: -1 });
  if (audio) {
    res.status(200).json(audio);
  } else {
    res.status(400).json({ msg: "Not found" });
  }
};

const getMoodByEnergy = async (req, res) => {
  const audio = await AudioFeature.findOne().sort({ energy: -1 });
  if (audio) {
    res.status(200).json(audio);
  } else {
    res.status(400).json({ msg: "Not found" });
  }
};

const getMoodByTempo = async (req, res) => {
  const audio = await AudioFeature.findOne().sort({ tempo: -1 });
  if (audio) {
    res.status(200).json(audio);
  } else {
    res.status(400).json({ msg: "Not found" });
  }
};

const getMoodByValence = async (req, res) => {
  const audio = await AudioFeature.findOne().sort({ valence: -1 });
  if (audio) {
    res.status(200).json(audio);
  } else {
    res.status(400).json({ msg: "Not found" });
  }
};

const getAudioByGenres = async (req, res) => {
  const { genre } = req.params;
  const audio = await AudioFeature.find({ genres: { $in: [`${genre}`] } });
  if (audio) {
    res.status(200).json(audio);
  } else {
    res.status(400).json({ msg: "Not found" });
  }
};

const searchByMulti = async (req, res) => {
  const { selectedMood, selectedGenres, selectedPlatforms } = req.body;
  let audios = [];
  const lowerGenres = selectedGenres.map((element) => {
    return element.toLowerCase();
  });
  if (lowerGenres && lowerGenres?.length > 0) {
    audios = await AudioFeature.find({ genres: { $all: lowerGenres } });
  } else {
    if (selectedPlatforms && selectedPlatforms?.length > 0) {
      audios = await AudioFeature.find({
        usecases: { $regex: selectedPlatforms[0], $options: "i" },
      });
    } else {
      if (selectedMood && selectedMood !== "") {
        if (selectedMood.toLowerCase() === "danceability") {
          audios.push(await AudioFeature.findOne().sort({ danceability: -1 }));
        } else {
          if (selectedMood.toLowerCase() === "energy") {
            audios.push(await AudioFeature.findOne().sort({ energy: -1 }));
          } else {
            if (selectedMood.toLowerCase() === "tempo")
              audios.push(await AudioFeature.findOne().sort({ tempo: -1 }));
            else
              audios.push(await AudioFeature.findOne().sort({ valence: -1 }));
          }
        }
      }
    }
  }
  if (selectedPlatforms && selectedPlatforms?.length > 0) {
    audios = audios.filter((audio) => {
      let bFound = true;
      selectedPlatforms.forEach((platform, idx) => {
        if (
          idx > 0 &&
          audio?.usecases?.toLowerCase().includes(platform?.toLowerCase()) ===
            false
        )
          bFound = false;
      });
      return bFound;
    });
  }
  if (selectedMood && selectedMood !== "") {
    if (selectedMood.toLowerCase() === "danceability") {
      audios = audios.sort((a, b) => a.danceability < b.danceability);
    } else {
      if (selectedMood.toLowerCase() === "energy") {
        audios = audios.sort((a, b) => a.energy < b.energy);
      } else {
        if (selectedMood.toLowerCase() === "tempo")
          audios = audios.sort((a, b) => a.tempo < b.tempo);
        else audios = audios.sort((a, b) => a.valence < b.valence);
      }
    }
  }
  if (audios && audios?.length > 0) {
    res.status(200).json(audios);
  } else {
    res.status(400).json([]);
  }
};

const getDataFromSpotify = async (req, res) => {
  const { trackId } = req.params;

  try {
    const trackUrl = `https://api.spotify.com/v1/tracks/${trackId}`;
    const trackSource = `/resource/spotify/${trackId}.mp3`;
    if (!fs.existsSync(`.${trackSource}`)) {
      const buffer = await spotify.downloadTrack(trackUrl, `.${trackSource}`);
      if (buffer)
        res
          .status(200)
          .json({ msg: "success", success: true, data: trackSource });
      else
        res.status(200).json({ msg: "Something went wrong", success: false });
    } else {
      res
        .status(200)
        .json({ msg: "success", success: true, data: trackSource });
    }
  } catch (e) {
    console.log("error in downloading license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getAvaliableGenres = async (req, res) => {
  const accessToken = await getToken();
  const genresRes = await axios({
    url: `https://api.spotify.com/v1/recommendations/available-genre-seeds`,
    method: "get",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });
  if (genresRes?.data) {
    res.status(200).json(genresRes?.data);
  } else {
    res.status(404).json({ msg: "Not Found" });
  }
};

const getPlaylistsByUser = async (sellerName) => {
  try {
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    const data = await spotifyApi.clientCredentialsGrant();
    await spotifyApi.setAccessToken(data.body.access_token);
    const searchRes = await spotifyApi.searchArtists(sellerName);
    const artist = searchRes.body.artists.items[0];

    if (artist.name === sellerName) {
      const albums = await axios({
        url: `https://api.spotify.com/v1/artists/${artist.id}/albums`,
        method: "get",
        headers: {
          Authorization: "Bearer " + data.body.access_token,
        },
      });
      let tracks = [];
      await Promise.all(
        albums?.data?.items?.map(async (item) => {
          const trackRes = await axios({
            url: `https://api.spotify.com/v1/albums/${item.id}/tracks`,
            method: "get",
            headers: {
              Authorization: "Bearer " + data.body.access_token,
            },
          });
          const newtrack = trackRes.data.items.map((ele) => {
            return {
              ...ele,
              imagePath: item.images[0].url,
              avatarPath: artist.images[0].url,
            };
          });
          tracks = [].concat(tracks, newtrack);
        })
      );
      return { status: 200, msg: "success", success: true, data: tracks };
    } else {
      return {
        status: 200,
        msg: "could not find the artist",
        success: false,
        data: null,
      };
    }
  } catch (e) {
    console.log("error", e);
    return {
      status: 500,
      msg: "something went wrong",
      success: false,
      data: null,
    };
  }
};

const getArtist = async (mediaName, accountAddress) => {
  const user = await User.findOne({ accountAddress });
  if (user) {
    const sellerAccountData = user?.sellerAccountData;
    let accountObj = null;
    if (sellerAccountData && sellerAccountData.length > 0) {
      accountObj = sellerAccountData.find(
        (account) =>
          account.platformTitle.toLowerCase() === mediaName.toLowerCase()
      );
      if (accountObj && accountObj?.accountData?.display_name) {
        if (!accountObj?.accountData?.sellerId) {
          const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
          });
          const token_data = await spotifyApi.clientCredentialsGrant();
          await spotifyApi.setAccessToken(token_data.body.access_token);
          const searchRes = await spotifyApi.searchArtists(
            accountObj?.accountData?.display_name
          );
          const artist = await findCorrectArtist(
            accountObj?.accountData?.display_name,
            searchRes.body.artists.items,
            token_data.body.access_token
          );
          accountObj.accountData.sellerId = artist.id;
          accountObj.accountData.avatarPath = artist.images[0]?.url;
          user.markModified("sellerAccountData");
          await user.save();
          return {
            ...artist,
            display_name: artist.name,
            avatarPath: artist.avatarPath,
            sellerId: artist.id,
            token: token_data.body.access_token,
          };
        } else {
          const token = await getToken();
          return { ...accountObj?.accountData, token };
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
};

const findCorrectArtist = async (sellerName, artist, token) => {
  try {
    let i = 0;
    let result = null;
    // infinite loop
    while (true) {
      const albumsRes = await axios({
        url: `https://api.spotify.com/v1/artists/${artist[i].id}/albums?offset=0&limit=1`,
        method: "get",
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const songsRes = await axios({
        url: `https://api.spotify.com/v1/albums/${albumsRes.data.items[0].id}/tracks?offset=0&limit=1`,
        method: "get",
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      let foundArtist = songsRes.data.items[0].artists.find(
        (artist) => artist.name === sellerName
      );
      if (foundArtist) {
        result = artist[i];
        break;
      }
      i++;
    }
    return result;
  } catch (e) {
    console.log(e);
    return null;
  }
};

const getAlbumsOfArtist = async (req, res) => {
  const { accountAddress, pageNumber } = req.body;
  try {
    const limit = 10;
    const offset = (pageNumber - 1) * limit;
    const user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    if (user) {
      const sellerData = user.sellerAccountData.find(
        (item) => item.platformTitle === PlatformTypes.spotify
      );
      const accountData = await SellerData.findOne({
        email: sellerData.associatedEmail,
        platformTitle: PlatformTypes.spotify,
      });
      const token = await getToken();
      if (accountData) {
        const albumsRes = await axios({
          url: `https://api.spotify.com/v1/artists/${accountData.sellerId}/albums?&offset=${offset}&limit=${limit}&include_groups=album,single`,
          method: "get",
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        const data = {
          accountId: accountData.sellerId,
          accountAvatar: accountData.avatarPath,
          accountName: accountData.sellerName,
          albums: albumsRes.data.items,
        };
        res.status(200).json({ msg: "success", success: true, data });
      } else {
        res
          .status(200)
          .json({ msg: "could not find the artist", success: false });
      }
    } else {
      res
        .status(200)
        .json({ msg: "could not find the artist", success: false });
    }
  } catch (e) {
    console.log("error in getting albums of artist", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const getSongsOfAlbum = async (req, res) => {
  const { albumId, pageNumber } = req.body;
  try {
    const limit = 10;
    const offset = (pageNumber - 1) * limit;
    const token = await getToken();
    const songsRes = await axios({
      url: `https://api.spotify.com/v1/albums/${albumId}/tracks?offset=${offset}&limit=${limit}&market=US`,
      method: "get",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    res
      .status(200)
      .json({ msg: "success", success: true, data: songsRes.data.items });
  } catch (e) {
    console.log("error in getting songs of album", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const searchAlbums = async (req, res) => {
  const { sellerId, albumName } = req.params;
  try {
    const limit = 50;
    let pageNumber = 1;
    let offset = (pageNumber - 1) * limit;
    const token = await getToken();
    let albumsRes;
    let totalAlbum = [];
    const sellerData = await SellerData.findOne({ sellerId });
    do {
      try {
        albumsRes = await axios({
          url: `https://api.spotify.com/v1/artists/${sellerId}/albums?&offset=${offset}&limit=${limit}&include_groups=album,single`,
          method: "get",
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        pageNumber++;
        offset = (pageNumber - 1) * limit;
        totalAlbum = [].concat(totalAlbum, albumsRes?.data?.items);
      } catch (e) {
        console.log("error in fetching all album", e);
      }
    } while (albumsRes?.data?.items?.length > 0);
    totalAlbum = totalAlbum.filter((item) =>
      item?.name?.toLowerCase()?.includes(albumName)
    );

    const data = {
      accountId: sellerData.sellerId,
      accountAvatar: sellerData.avatarPath,
      accountName: sellerData.sellerName,
      albums: totalAlbum,
    };
    res.status(200).json({ msg: "success", success: true, data });
  } catch (e) {
    console.log("error in searching albums of artist", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const searchTracks = async (req, res) => {
  const { albumId, trackName } = req.params;
  try {
    const limit = 50;
    let pageNumber = 1;
    let offset = (pageNumber - 1) * limit;
    const token = await getToken();
    let songsRes;
    let totalSongs = [];
    do {
      try {
        songsRes = await axios({
          url: `https://api.spotify.com/v1/albums/${albumId}/tracks?offset=${offset}&limit=${limit}&market=US`,
          method: "get",
          headers: {
            Authorization: "Bearer " + token,
          },
        });
        pageNumber++;
        offset = (pageNumber - 1) * limit;
        totalSongs = [].concat(totalSongs, songsRes?.data?.items);
      } catch (e) {
        console.log("error in fetching all album", e);
      }
    } while (songsRes?.data?.items?.length > 0);
    totalSongs = totalSongs.filter((item) =>
      item?.name?.toLowerCase()?.includes(trackName)
    );
    res.status(200).json({ msg: "success", success: true, data: totalSongs });
  } catch (e) {
    console.log("error in getting track of artist", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const getGenresOfArtists = async (req, res) => {
  try {
    const { artistsQuery } = req.params;
    const token = await getToken();
    const genresRes = await axios({
      url: `https://api.spotify.com/v1/artists?ids=${artistsQuery}`,
      method: "get",
      headers: {
        Authorization: "Bearer " + token,
      },
    });
    let genres = [];
    genresRes.data.artists.map((item) => {
      genres = [].concat(genres, item.genres);
    });
    res.status(200).json({ msg: "success", success: true, data: genres });
  } catch (e) {
    console.log("error in gettting genres", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getAvatarPathByDisplayname = async (req, res) => {
  try {
    const { displayName, sellerId } = req.body;
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });
    const token_data = await spotifyApi.clientCredentialsGrant();
    await spotifyApi.setAccessToken(token_data.body.access_token);
    const searchRes = await spotifyApi.searchArtists(displayName);
    let searchedArtits = searchRes.body.artists.items;
    let artist = searchedArtits.find(
      (artist) =>
        artist.name.toLowerCase() === displayName.toLowerCase() &&
        sellerId.toLowerCase() === artist?.id?.toLowerCase()
    );
    if (artist) {
      res.status(200).json({
        msg: "Success",
        success: true,
        data: artist.images[0]?.url,
      });
    } else {
      res
        .status(200)
        .json({ msg: "This is not artist Acccount", success: false });
    }
  } catch (e) {
    console.log("Error in fetching avatar from artist name", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

module.exports = {
  getDatabaseByRecordLabel,
  getPlaylistsByUser,
  getPlaylistsByOrg,
  saveAudioFeaturesByUserName,
  saveAudioFeaturesByTrackId,
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
  findCorrectArtist,
  getGenresOfArtists,
  getAvatarPathByDisplayname,
};
