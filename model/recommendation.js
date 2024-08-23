const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  recommendedLicenseId: { type: String },
  recommendedLink: { type: String },
  socialMediaName: { type: String },
  contentId: { type: String },
  claimId: { type: String },
  licenseName: { type: String },
  sellerName: { type: String },
  creatorNames: { type: Array },
  status: { type: Number, default: 1 }, // 1 - pending, 2 - purchased, 3 - didnt purchased
  userIds: [String],
  createdAt: {
    type: Number,
    default: Math.floor(Date.now()),
  },
};

// One nice, clean line to create the Schema.
const recommendationSchema = new Schema(fields);

module.exports = mongoose.model("Recommendation", recommendationSchema);
