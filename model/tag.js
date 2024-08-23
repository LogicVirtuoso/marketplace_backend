const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  contentId: { type: String },
  licenseName: { type: String },
  socialMediaName: { type: String },
  safeType: { type: Number }, // 0 - none tag, 1 - safe, 2 - unsafe
};

// One nice, clean line to create the Schema.
const tagSchema = new Schema(fields);

module.exports = mongoose.model("Tag", tagSchema);
