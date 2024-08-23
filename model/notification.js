const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  eventType: { type: Number, required: true },
  reader: { type: String },
  description: { type: String },
  readed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Number,
    default: Date.now(),
  },
};

// One nice, clean line to create the Schema.
const notificationSchema = new Schema(fields);

module.exports = mongoose.model("Notification", notificationSchema);
