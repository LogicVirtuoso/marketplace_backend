const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  tokenId: { type: Number },
  listedId: { type: Number },
  sellerId: { type: String },
  sellerAddress: { type: String },
  buyerAddress: { type: String },
  price: { type: Number },
  eventType: { type: Number },
  licensingType: { type: Number },
  tokenURI: { type: String, required: true },
  accessLevel: { type: Number },
  counts: { type: Number },
  usecase: { type: String },
  contentId: { type: String },
  isBurned: { type: Boolean },
  action: { type: String },
  status: { type: Number }, // 0 - pending, 1 - approved, 2 - rejected
  ownerInfo: { type: Object },
  transactionHash: { type: String },
  publicLinked: { type: Boolean, default: false },
  createdAt: {
    type: Number,
  },
};

// One nice, clean line to create the Schema.
const soldLicensesSchema = new Schema(fields);

module.exports = mongoose.model("SoldLicenses", soldLicensesSchema);
