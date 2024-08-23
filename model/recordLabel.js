const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  trackId: { type: String },
  companyName: { type: String },
  name: { type: String },
  images: [],
  createdAt: {
    type: Date,
    default: Date.now,
  },
};

// One nice, clean line to create the Schema.
const recordLabelSchema = new Schema(fields);

module.exports = mongoose.model("RecordLabel", recordLabelSchema);
