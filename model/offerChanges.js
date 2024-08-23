const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  offerId: { type: Number },
  offerPrice: { type: Number },
  offerDuration: { type: Number },
  tokenURI: { type: String },
  historyId: { type: Number },
  createdAt: { type: Number, default: Date.now() },
};

// One nice, clean line to create the Schema.
const offerChangesSchema = new Schema(fields);

module.exports = mongoose.model("OfferChanges", offerChangesSchema);
