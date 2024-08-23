const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Data we need to collect/confirm to have the app go.
const fields = {
  accountAddress: { type: String }, // Metamask Wallet ID
  avatar: { type: String }, // avatar path
  banner: { type: String }, // banner path
  address: { type: String }, // Home address
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String }, // Email Address
  timeOfCreation: {
    type: Date,
    default: Date.now(),
  }, // Time of Account Creation
  // account role
  role: { type: Number }, //0 - buyer, 1 - seller, 2 - mixed, -1 - none
  recordLabel: { type: Object },
  // Seller Account Data
  sellerAccountData: { type: Array },
  // Buyer Account Data
  buyerAccountData: { type: Array },
  /* Favorited License ID 
      Data entry example: ( 1234ABCD5678EFGH90IJ ) or ( Null )
	    ( This List continues for each ID for the users Favorited Licenses ) */
  favoritedLicenseIds: { type: Array },
  /* Followed Accounts
  Sellers ID of Followed Account- Data entry example: ( xxx...12345﻿﻿ ) or ( Null )
	Time of Follow- Data entry example: January 15th, 2022, 10:05 PM EST﻿
	( This List continues in groups for each Wallet ID for the users Followed Accounts ) */
  followedAccounts: { type: Array },
  /* Notification Settings
    Follower Notifications-  Data entry example: ( Yes ) or ( No )
	  Sales Notification-  Data entry example: ( Yes ) or ( No )
	  Nitrility Announcements-  Data entry example: ( Yes ) or ( No )
  */
  notificationSettings: { type: Object },

  buyerMailingInfo: {
    type: Object,
    default: {
      mail: "",
      mailingAddress: "",
    },
  },

  sellerMailingInfo: {
    type: Object,
    default: {
      mail: "",
      mailingAddress: "",
    },
  },

  confirmed: {
    type: Boolean,
    default: true,
  },

  locked: {
    type: Boolean,
    default: false,
  },

  linked: {
    type: Boolean,
    default: false,
  },

  verifications: {
    type: Array,
  },

  nonce: {
    type: String,
    default: () => Math.floor(Math.random() * 1000000), // Initialize with a random
  },
};

// One nice, clean line to create the Schema.
const userSchema = new Schema(fields);

module.exports = mongoose.model("User", userSchema);
