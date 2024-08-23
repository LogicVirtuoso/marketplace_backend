/**
 * @swagger
 *   components:
 *     schemas:
 *       SocialMedia:
 *         type: array
 *         items:
 *           type: object
 *           properties:
 *               gmail:
 *                   type: string
 *                   description: gmail of the twitch account
 *                   example: james.liu.vectorspace@gmail.com
 *               channelIds:
 *                   type: array
 *                   items:
 *                       type: string
 *                       description: channel ids of the this gmail
 *                       example: ["UCMZbPF_knaQvdsyTP6RcxCw", "UCNOPIC6pw411-lKy1OAa6cQ"]
 *
 */

/**
 * @swagger
 *   components:
 *     schemas:
 *       NewUser:
 *         type: object
 *         required:
 *           - accountAddress
 *           - email
 *           - address
 *           - country
 *           - city
 *           - state
 *           - zipcode
 *           - userName
 *           - sellerType
 *           - groupType
 *           - signUpType
 *           - spotify
 *           - organization
 *           - confirmed
 *           - image
 *           - verified
 *         properties:
 *           accountAddress:
 *             type: array
 *             items:
 *               type: string
 *             description: account addresses of the user.
 *             example: ["0x937B52690883994B0549b6a3093356b83a1F59a0", "0xfc218564694314ebF4a4E53D661aC85a1B13b734"]
 *           email:
 *             type: string
 *             description: email address of the user
 *             example: james.liu.vectorspace@gmail.com
 *           address:
 *             type: string
 *             description: address of the user.
 *             example: 433 Redberry Way
 *           country:
 *             type: string
 *             description: country of the user
 *             example: USA
 *           city:
 *             type: string
 *             description: city of the user
 *             example: Modesto
 *           state:
 *             type: string
 *             description: state of the user
 *             example: California
 *           zipcode:
 *             type: string
 *             description: zipcode of the user
 *             example: 95555
 *           userName:
 *             type: string
 *             description: user id of the spotify
 *             example: avipatel0408
 *           sellerType:
 *             type: string
 *             description: type of the seller
 *             example: Buyer/Creator
 *           groupType:
 *             type: string
 *             description: type of the group
 *             example: Individual/Group
 *           signUpType:
 *             type: string
 *             description: type of the sign up
 *             example: Spotify Login
 *           spotify:
 *             type: object
 *             description: spotify profile of the user
 *             example: {}
 *           organization:
 *             type: string
 *             description: organization name
 *             example: sony music
 *           confirmed:
 *             type: boolean
 *             description: if the account is confirmed by the user?
 *             example: true
 *           image:
 *             type: string
 *             description: image path of the user avatar
 *             example: /upload/images/avatar.png
 *           nonce:
 *             type: string
 *             description: nonce for the signup
 *             example: 96321
 *           verifiedEmails:
 *             type: array
 *             items:
 *               type: string
 *             description: verified emails
 *             example: ["james.liu.vectorspace@gmail.com", "prof.vector.space@outook.com"]
 *           bannerImage:
 *             type: string
 *             description: banner image path
 *             example: /upload/images/banner.png
 *           verified:
 *             type: boolean
 *             description: if the user verified this account?
 *             example: true
 *           visitCount:
 *             type: integer
 *             description: count of the visitors
 *             example: 23
 *           volume:
 *             type: integer
 *             description: sold volume in Et
 *             example: 0.1
 *           twitch:
 *             schemas:
 *               $ref: '#/components/schemas/SocialMedia'
 *           youtube:
 *             schemas:
 *               $ref: '#/components/schemas/SocialMedia'
 *           twitter:
 *             schemas:
 *               $ref: '#/components/schemas/SocialMedia'
 *           instagram:
 *             schemas:
 *               $ref: '#/components/schemas/SocialMedia'
 *           isLocked:
 *             type: boolean
 *             description: is this account locked?
 *             example: false
 *       User:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   _id:
 *                       type: integer
 *                       description: The auto-generated id of the user.
 *                       example: 0
 *               - $ref: '#/components/schemas/NewUser'
 *
 */

const router = require("express").Router();
const { authenticateUser } = require("../middleware/auth");

const {
  // sign up and sign in
  signInByMagic,
  adminSignIn,
  adminSignUp,
  getAllBuyers,
  getAllArtists,
  getAllCustomers,
  deleteBuyerById,
  deleteArtistById,
  deleteCustomerById,
  updateProfileByAdmin,
  updateCustomerProfileByAdmin,
  createProfileByAdmin,
  createCustomerProfileByAdmin,
  sendCodeToPersonalEmail,
  sendCodeToPlatformEmail,
  checkPersonalCode,
  uploadImage,
  searchArtists,
  savePublicProfile,
  updatePublicProfile,
  deleteCollection,
  removeCollection,
  getPublicProfile,
  getCollectionData,
  getContactInfoOfOffer,
  checkIfLiked,
  likeOrDislikeLicense,
  sendVerificationCodeToSpotifyEmail,
  sendVCodeToSpotifyEmail,
  verifySellerAccount,
  checkFollowing,
  updateFollow,
  getFollowingBuyers,
  updateBuyerPlatform,
  updateAddressHandler,
  updateSellerPlatform,
  getBuyerPlatform,
  getSellerPlatform,
  getCurrentAccount,
  deleteSellerAccount,
  getPrivateProfileData,
  getFavoriteLicenseIds,
  updateUsername,
  getUserLegalName,
  sendEmailToCollaborators,
  getTotalLikers,
  getSellerData,
  updateSellerProfile,
  getSocialAccounts,
  updateSellerMailingInfo,
  updateBuyerMailingInfo,
  getSellerMailingInfo,
  getBuyerMailingInfo,
  addProfileViewer,
} = require("../controller/user");

router.post("/signin-by-magic", signInByMagic);

router.post("/admin-signin", adminSignIn);

router.post("/admin-signup", adminSignUp);

router.get("/all-buyers", getAllBuyers); // gets all the buyer list

router.get("/all-artists", getAllArtists); // gets all the artists list

router.get("/all-customers", getAllCustomers); // gets all the customers list

router.delete("/buyer/:id", deleteBuyerById); // delete the buyer by his id

router.delete("/artist/:id", deleteArtistById); // delete the artist by his id

router.delete("/customer/:id", deleteCustomerById); // delete the customer by his id

router.post("/update-user", updateProfileByAdmin); //update the user profile by admin

router.post("/update-customer", updateCustomerProfileByAdmin); //update the customer profile by admin

// ======================= User and Seller =============================//
//create the user account by admin
router.post("/create-user", createProfileByAdmin);

//create the customer account by admin
router.post("/create-customer", createCustomerProfileByAdmin);
router.post("/artists/search", searchArtists);

router.post("/sendcode/personalemail", sendCodeToPersonalEmail);

router.post("/sendcode/platformemail", sendCodeToPlatformEmail);

router.post("/check-personalcode", checkPersonalCode);

router.post("/images/upload", uploadImage);

router.post("/save-profile", authenticateUser, savePublicProfile);

router.post("/update-profile", authenticateUser, updatePublicProfile);

router.get(
  "/delete-profile/:sellerId/:collectionId",
  authenticateUser,
  deleteCollection
);

router.get(
  "/remove-profile/:sellerId/:collectionId",
  authenticateUser,
  removeCollection
);

router.get(
  "/fetch-profile/:sellerId",
  // authenticateUser,
  getPublicProfile
);

router.get("/fetch-sellerdata/:sellerId", getSellerData);
router.post("/update-seller-profile", authenticateUser, updateSellerProfile);

router.get("/fetch-collection/:sellerId/:collectionId", getCollectionData);

// returns contact info of seller by account address
router.get("/contact/:accountAddress", authenticateUser, getContactInfoOfOffer);

router.post("/favorite", checkIfLiked);

// like or dislike the license
router.post("/likeOrDislike", authenticateUser, likeOrDislikeLicense);

router.get(
  "/favorite-licenses/:accountAddress",
  authenticateUser,
  getFavoriteLicenseIds
);

router.post("/send-code-spotify", sendVerificationCodeToSpotifyEmail);

router.post("/add/send-code-spotify", sendVCodeToSpotifyEmail);

router.post("/verify-spotify", verifySellerAccount);

// check if the user is following the artist
router.post("/check-following", authenticateUser, checkFollowing);

// update following status
router.post("/update-follow", authenticateUser, updateFollow);

// get all following buyers of the seller
router.get("/get-following-buyers/:sellerId", getFollowingBuyers);

// update the buyer acounts of one user account
router.post("/update-buyerplatform", authenticateUser, updateBuyerPlatform);

// update user's home address
router.post("/update-address", authenticateUser, updateAddressHandler);

// update the seller acounts of one user account
router.post("/update-sellerplatform", authenticateUser, updateSellerPlatform);

// returns buyer accounts of one user account
router.get(
  "/get-buyerplatform/:accountAddress",
  authenticateUser,
  getBuyerPlatform
);

// returns seller accounts of one user account
router.get(
  "/get-sellerplatform/:accountAddress",
  authenticateUser,
  getSellerPlatform
);

router.post("/current-account", authenticateUser, getCurrentAccount);

router.delete("/seller-account", authenticateUser, deleteSellerAccount);

router.get(
  "/fetch-private-data/:accountAddress",
  authenticateUser,
  getPrivateProfileData
);

// update user name
router.post("/update-name", authenticateUser, updateUsername);
router.post("/update-buyer-mailing", authenticateUser, updateBuyerMailingInfo);
router.post(
  "/update-seller-mailing",
  authenticateUser,
  updateSellerMailingInfo
);
router.get("/fetch-buyer-mailing", authenticateUser, getBuyerMailingInfo);
router.get("/fetch-seller-mailing", authenticateUser, getSellerMailingInfo);

// get user name
router.get("/user-legal-name", authenticateUser, getUserLegalName);

router.post(
  "/email-to-collaborators",
  authenticateUser,
  sendEmailToCollaborators
);

// fetch total likers
router.post("/fetch-total-likers", getTotalLikers);

// fetch social accounts of the public site
router.get("/fetch-social-accounts/:sellerId", getSocialAccounts);

// add visitor of the public profile
router.post("/add-viewer", addProfileViewer);

module.exports = router;
