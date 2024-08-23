const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  email: { type: String },
  password: { type: String },
  userName: { type: String },
  avatar: { type: String },
  role: { type: String },  // 0 - admin, 1 - normal customer, 2 - CTO, 3 - PM, etc. 
  status: { type: Number }, // 0 - actived, 1 - pending, 2 - suspended.
};

// One nice, clean line to create the Schema.
const adminSchema = new Schema(fields);

module.exports = mongoose.model("Admin", adminSchema);
