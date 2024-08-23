/**
 * @swagger
 * tags:
 * name: Licenses
 * description: API to manage your licenses.
 */

/**
 * @swagger
 *   components:
 *     schemas:
 *       NewLicense:
 *           type: object
 *           required:
 *             - image
 *             - licenseName
 *             - organization
 *             - createdBy
 *           properties:
 *             image:
 *               type: string
 *               description: image path of the license.
 *               example: /uploads/license/62f68b6fe407a30b20bcb5cb.png
 *             licenseName:
 *               type: string
 *               description: license name.
 *               example: my house
 *             organization:
 *               type: string
 *               description: organization name.
 *               example: sony music
 *             createdBy:
 *               type: string
 *               description: artist name
 *               example: Ryan
 *       License:
 *         allOf:
 *           - type: object
 *             properties:
 *               _id:
 *                 type: integer
 *                 description: The License ID.
 *                 example: 0
 *           - $ref: '#/components/schemas/NewLicense'
 *
 */

const router = require("express").Router();
const { authenticateUser } = require("../middleware/auth");

const {
  getSoldLicenses,
  getTopArtist,
  deleteRecommendedLicense,
  getTopSellingLicense,
  getTrendingLicense,
  getMostPopularLicenses,
  getOrdersByLicenseType,
  getSaleVolumeByMonth,
  getOwnedLicense,
  getPurchasedNonExclusive,
  getPublicLicense,
  publishLicense,
  getTotalOwners,
  getSaleStats,
} = require("../controller/soldLicenses");

router.post("/recommendedlicense", authenticateUser, deleteRecommendedLicense);

router.get("/groups/:sellerId", authenticateUser, getSoldLicenses);

router.get("/top/:time", getTopArtist);

router.get("/top-selling-license/:time", getTopSellingLicense);

router.get("/trending-license/:time", getTrendingLicense);

router.post("/most-popular-licenses", authenticateUser, getMostPopularLicenses);

router.post("/orders-by-licensetype", authenticateUser, getOrdersByLicenseType);

router.post("/sale-volume-by-month", authenticateUser, getSaleVolumeByMonth);

router.post("/owned", authenticateUser, getOwnedLicense);

router.get(
  "/purchased-non-exclusive/:listedId",
  authenticateUser,
  getPurchasedNonExclusive
);

router.get(
  "/public/:tokenId/:accountAddress",
  authenticateUser,
  getPublicLicense
);

router.get(
  "/publish-public-license/:tokenId",
  authenticateUser,
  publishLicense
);

router.post("/fetch-total-owners", getTotalOwners);

router.get("/fetch-sale-stats/:sellerId", authenticateUser, getSaleStats);

module.exports = router;
