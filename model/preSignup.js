const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  accountAddress: { type: String },
  userName: { type: String },
  isSeller: { type: Boolean },
  sellerVerifications: {
    type: Array,
  },
  buyerVerification: {
    type: Object,
  },
  sentTime: {
    type: Date,
    default: Date.now(),
  },
};

// One nice, clean line to create the Schema.
const preSignupSchema = new Schema(fields);

module.exports = mongoose.model("PreSignUp", preSignupSchema);
