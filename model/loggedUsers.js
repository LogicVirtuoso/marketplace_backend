const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  accountAddress: { type: String, required: true },
  ipAddress: { type: String, required: true },
  location: { type: String, required: true },
  status: {
    type: Boolean,
    default: true,
  },
  deviceInfo: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Number,
    default: Date.now(),
  },
};

// One nice, clean line to create the Schema.
const loggedUsersSchema = new Schema(fields);

module.exports = mongoose.model("LoggedUsers", loggedUsersSchema);
