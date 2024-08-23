const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  listedId: { type: Number },
  signingData: { type: Object },
  historyId: { type: Number },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
};

// One nice, clean line to create the Schema.
const licenseChangeSchema = new Schema(fields);

module.exports = mongoose.model("LicenseChange", licenseChangeSchema);
