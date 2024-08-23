const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  id: { type: String, required: true },
  submissionTime: { type: Date },
  clientId: { type: String, required: true },
  status: { type: Number }, // 0 - pending, 1 - Business, 2 - no Business
  externalRef: { type: String },
  companyName: { type: String },
  registrationNumber: { type: String },
  accountAddress: { type: String },
  country: { type: String },
  directorName: { type: String },
  directorEmail: { type: String },
  userRole: { type: Number, required: true },
};

// One nice, clean line to create the Schema.
const idenfySchema = new Schema(fields);

module.exports = mongoose.model("Idenfy", idenfySchema);
