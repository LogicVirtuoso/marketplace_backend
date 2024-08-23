const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  claimId: { type: String },
  contentId: { type: String },
  userId: { type: String },
  licenseName: { type: String },
  creatorNames: { type: Array },
  decisionOfRuling: { type: String },
  socialMediaName: { type: String },
  burnedLicenseId: { type: String },
  active: { type: Number, default: 0 }, // 0 - default, if social media reported the inappropriate, should be 1, again if they reported the appeal, should be 2
  storedTime: {
    type: Date,
    default: Date.now,
  },
};

// One nice, clean line to create the Schema.
const licenseReportSchema = new Schema(fields);

module.exports = mongoose.model("LicenseReport", licenseReportSchema);
