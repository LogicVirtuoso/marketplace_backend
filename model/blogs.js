const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  title: { type: String },
  image: { type: String },
  link: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
};

// One nice, clean line to create the Schema.
const blogSchema = new Schema(fields);

module.exports = mongoose.model("Blog", blogSchema);
