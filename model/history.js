const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  eventType: { type: Number, required: true },
  listedId: { type: Number, required: true },
  tokenId: { type: Number },
  price: { type: Number },
  licensingTypes: { type: [Number] },
  accessLevel: { type: Number },
  expirationTime: { type: Number },
  from: { type: Array, required: true }, // Assuming the array holds strings, change if necessary
  to: { type: Array }, // Assuming the array holds strings, change if necessary
  offerType: { type: Number },
  transactionHash: { type: String },
  counts: { type: Number },
  createdAt: {
    type: Number,
    default: Date.now,
  },
  historyId: {
    type: Number,
    unique: true,
    sparse: true,
  },
};

const historySchema = new Schema(fields);

historySchema.pre("save", async function (next) {
  const doc = this;
  if (doc.isNew) {
    try {
      const maxHistory = await mongoose
        .model("History")
        .findOne({}, {}, { sort: { historyId: -1 } });
      doc.historyId = maxHistory ? maxHistory.historyId + 1 : 1;
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("History", historySchema);
