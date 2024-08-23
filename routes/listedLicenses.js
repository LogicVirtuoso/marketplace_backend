/**
 * @swagger
 *   components:
 *     schemas:
 *       NewListedLicense:
 *         type: object
 *         required:
 *           - listedId
 *           - usecases
 *           - licenseName
 *           - sellerName
 *           - acousticness
 *           - danceability
 *           - energy
 *           - trackId
 *           - instrumentalness
 *           - key
 *           - liveness
 *           - mode
 *           - speechiness
 *           - tempo
 *           - time_signature
 *           - valence
 *           - genres
 *           - createdAt
 *         properties:
 *           listedId:
 *             type: string
 *             description: listedId of the minted license
 *             example: 1
 *           usecases:
 *             type: object
 *             properties:
 *               youtube:
 *                   type: string
 *               twitch:
 *                   type: string
 *               twitter:
 *                   type: string
 *               instagram:
 *                   type: string
 *           createdBy:
 *             type: string
 *             description: wallet address of the creator
 *             example: "0x937B52690883994B0549b6a3093356b83a1F59a0"
 *           title:
 *             type: string
 *             description: song name
 *             example: my house
 *           acousticness:
 *             type: string
 *             description: acousticness of the song
 *             example: 0.169
 *           danceability:
 *             type: string
 *             description: danceability of the song
 *             example: 0.966
 *           energy:
 *             type: string
 *             description: energy of the song
 *             example: 0.698
 *           trackId:
 *             type: string
 *             description: trackId of the song
 *             example: 1234567
 *           instrumentalness:
 *             type: string
 *             description: instrumentalness of the song
 *             example: 0.9654
 *           key:
 *             type: string
 *             description: key of the song
 *             example: 1
 *           liveness:
 *             type: string
 *             description: liveness of the song
 *             example: 0.321
 *           mode:
 *             type: string
 *             description: mode of the song
 *             example: 0.2563
 *           speechiness:
 *             type: string
 *             description: speechiness of the song
 *             example: 0.2563
 *           tempo:
 *             type: string
 *             description: tempo of the song
 *             example: 0.2563
 *           time_signature:
 *             type: string
 *             description: time_signature of the song
 *             example: 0.2563
 *           valence:
 *             type: string
 *             description: valence of the song
 *             example: 0.2563
 *           genres:
 *             type: array
 *             items:
 *               type: string
 *             example: ["pop", "dark pop"]
 *       ListedLicense:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   _id:
 *                       type: integer
 *                       description: The auto-generated id of the listedLicense.
 *                       example: 0
 *                   visitCount:
 *                       type: integer
 *                       description: the count users visited the license.
 *                       example: 12
 *                   visitors:
 *                       type: object
 *                       items:
 *                           type: string
 *                       description: id addresses of the visitors
 *                       example: ["0.0.0.1", "0.0.0.3"]
 *                   createdAt:
 *                       type: string
 *                       description: created date
 *                       example: 2017/10/21
 *               - $ref: '#/components/schemas/NewListedLicense'
 *
 */

const router = require("express").Router();
const {
  authenticateUser,
  authorizeUserRole,
  authorizeUserByListedIdOfParam,
  authorizeUserByListedIdOfBody,
} = require("../middleware/auth");

const {
  searchLicenses,
  checkduplication,
  getListedLicenseBySellerId,
  getAllUnLicensesBySellerId,
  getRecentUploads,
  getAllLicenses,
  approveLicense,
  unlistLicense,
  unlistLicenseAll,
  rejectLicense,
  uploadLicenseData,
  adjustLicense,
  getLicenseForListedId,
  getNextOrPreviousLicense,
  getListedLicensesByIds,
  getPendingListings,
  getTotalViewers,
  addViewer,
  getAdditionalInfo,
  getCartedLicenses,
  getRecommendingLicenses,
} = require("../controller/listedLicenses");

// search license by license name
router.post("/license-search", searchLicenses);

// returns all listed license for specific artist
router.get("/all-licenses/:sellerId", getListedLicenseBySellerId);

// returns unlisted license for specific artist
router.get(
  "/unlisted/:sellerId",
  authenticateUser,
  authorizeUserRole,
  getAllUnLicensesBySellerId
);

// returns all licenses
router.get("/all", getAllLicenses);

// check if the license was already listed
router.post(
  "/checkduplication",
  authenticateUser,
  authorizeUserRole,
  checkduplication
);

// returns recent uploaded licenses
router.get("/recent-uploads", getRecentUploads);

// unlist the license
router.post(
  "/unlist",
  authenticateUser,
  authorizeUserByListedIdOfBody,
  unlistLicense
);

// unlist all license
router.post(
  "/unlist-all",
  authenticateUser,
  authorizeUserByListedIdOfBody,
  unlistLicenseAll
);

// approve the incoming co-owned license
router.get("/approve-license/:listedId", authenticateUser, approveLicense);

// reject the incoming co-owned license
router.get("/reject-license/:listedId", authenticateUser, rejectLicense);

// list the license data
router.post(
  "/upload-license",
  authenticateUser,
  authorizeUserRole,
  uploadLicenseData
);

// list the media sync license data
// router.post("/upload-mediasync", authenticateUser, authorizeUserRole, uploadMediaSyncLicense);

// adjust the license data
router.post("/adjust-license", authenticateUser, adjustLicense);

// adjust the media sync license data
// router.post("/adjust-mediasync", authenticateUser, authorizeUserByListedIdOfBody, adjustMediaSync);

// returns listed license
router.get("/get-license/:listedId", getLicenseForListedId);

// when click the prev or next button on music play bar, returns next or prev licenses
router.get(
  "/get-next-or-previous-license/:listedId/:isPrevious",
  getNextOrPreviousLicense
);

// returns listed licenses for multiple listedIds
router.post("/get-listed-licenses", getListedLicensesByIds);

// returns in or outgoing licenses by artist id and search filter
router.post(
  "/pending-listings",
  authenticateUser,
  authorizeUserRole,
  getPendingListings
);

// fetch total viewers by listed license id
router.post("/fetch-total-viewers", getTotalViewers);

// add new viewer to license
router.post("/add-new-viewer", addViewer);

// add new viewer to license
router.post("/fetch-additional-info", getAdditionalInfo);

// fetch all carted licenses
router.post("/fetch-carted-licenses", getCartedLicenses);

// get all following sellers
router.get("/get-recommended-licenses/:buyerAddress", getRecommendingLicenses);

module.exports = router;
