const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  offerType: { type: Number },
  offerId: { type: Number },
  listedId: { type: Number },
  sellerId: { type: String },
  buyerAddr: { type: String },
  preOffers: { type: Array },
  offerPrice: { type: Number },
  offerDuration: { type: Number },
  counts: { type: Number },
  tokenURI: { type: String },
  eventType: { type: Number },
  licensingType: { type: Number },
  accessLevel: { type: Number },
  signingData: {
    type: Object,
  },
  transactionHash: { type: String },
  buyerStatus: { type: Number },
  sellerStatus: { type: Number },
  createdAt: { type: Number },
};

// One nice, clean line to create the Schema.
const offersSchema = new Schema(fields);

module.exports = mongoose.model("Offers", offersSchema);
