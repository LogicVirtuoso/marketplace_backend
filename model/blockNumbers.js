const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  number: { type: Number, default: 33294776 },
};

// One nice, clean line to create the Schema.
const blockNumberSchema = new Schema(fields);
const BlockNumber = mongoose.model("BlockNumber", blockNumberSchema);

module.exports = BlockNumber;

async function getSingletonDocument() {
  // Find the first document in the collection.
  const doc = await BlockNumber.findOne();

  // If a document is found, return it.
  if (doc) {
    return doc;
  }

  // If no document is found, create a new one and return it.
  return BlockNumber.create({});
}

getSingletonDocument();
