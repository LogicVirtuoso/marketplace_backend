const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  platformTitle: { type: String },
  sellerName: { type: String },
  email: { type: String },
  sellerId: { type: String },
  avatarPath: { type: String },
  createdAt: {
    type: Number,
    default: Date.now(),
  },
};

// One nice, clean line to create the Schema.
const sellerDataSchema = new Schema(fields);

module.exports = mongoose.model("SellerData", sellerDataSchema);
