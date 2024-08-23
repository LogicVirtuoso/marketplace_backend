const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  sellerName: { type: String },
  sellerId: { type: String },
  collections: { type: Array },
  contacts: { type: Object },
  socials: { type: Object },
  bio: { type: String },
  visitors: { type: Array },
};
// One nice, clean line to create the Schema.
const PublicSchema = new Schema(fields);

module.exports = mongoose.model("PublicProfile", PublicSchema);
