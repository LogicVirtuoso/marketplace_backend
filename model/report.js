const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  from: { type: String },
  to: { type: String },
  type: { type: String },
  contents: { type: String },
};
// One nice, clean line to create the Schema.
const ReportSchema = new Schema(fields);

module.exports = mongoose.model("Report", ReportSchema);
