const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
    acousticness:{type: String},
    // analysis_url:{type: String},
    danceability:{type: String},
    // duration_ms: {type: String},
    energy: {type: String},
    id: {type: String},
    instrumentalness: {type: String},
    key: {type: String},
    liveness: {type: String},
    mode: {type: String},
    speechiness: {type: String},
    tempo: {type: String},
    time_signature: {type: String},
    // track_href: {type: String},
    // type: {type: String},
    // uri: {type: String},
    valence: {type: String},
    genres: [],
    usecases: {type: Object}
};

// One nice, clean line to create the Schema.
const audioFeatureSchema = new Schema(fields);

module.exports = mongoose.model("AudioFeature", audioFeatureSchema);
