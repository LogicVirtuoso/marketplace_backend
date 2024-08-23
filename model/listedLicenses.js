const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  /* Common Property of the license */
  licenseName: { type: String, required: true }, // Exact name of song, movie, or listed Item
  albumName: { type: String, required: true }, // Exact name of album, movie, or listed Item
  albumId: { type: String, required: true }, // Exact id of album, movie, or listed Item
  sellerName: { type: String, required: true }, // Name of each artist the song is made by, or movie creators ( not who it was listed by, but actually who it was made by )
  sellerAddress: { type: String, required: true }, // Name of each artist the song is made by, or movie creators ( not who it was listed by, but actually who it was made by )
  sellerId: { type: String, required: true },
  listedId: {
    type: Number, // or whichever data type you want for your index
    unique: true, // ensure uniqueness
    index: { unique: true, sparse: true }, // create a unique index
  },
  tokenURI: { type: String, required: true },
  imagePath: { type: String, required: true },
  avatarPath: { type: String, required: true },
  previewUrl: { type: String, required: true },
  artists: { type: Array },
  trackId: { type: String, required: true },
  length: { type: Number, required: true },
  acousticness: { type: String, required: true },
  danceability: { type: String, required: true },
  energy: { type: String, required: true },
  instrumentalness: { type: String, required: true },
  liveness: { type: String, required: true },
  mode: { type: String, required: true },
  tempo: { type: Number, required: true },
  genres: { type: Array },
  // Licensing Options
  signingData: { type: Object },
  // Listed Status
  visitors: { type: Array },
  // listing time
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // If the song is currently listed on the marketplace or not
};

// One nice, clean line to create the Schema.
const listedLicensesSchema = new Schema(fields);

listedLicensesSchema.pre("save", function (next) {
  const doc = this;

  if (doc.isNew) {
    mongoose
      .model("ListedLicenses", listedLicensesSchema)
      .countDocuments((err, count) => {
        if (err) {
          return next(err);
        }

        doc.listedId = count + 1;
        next();
      });
  } else {
    next();
  }
});

module.exports = mongoose.model("ListedLicenses", listedLicensesSchema);
