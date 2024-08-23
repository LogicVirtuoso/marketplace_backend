/**
 * @swagger
 *   components:
 *     schemas:
 *       ReportItem:
 *           type: object
 *           required:
 *             - claimId
 *             - contentId
 *             - userId
 *             - licenseName
 *             - creatorNames
 *             - socialMediaName
 *           properties:
 *             claimId:
 *               type: string
 *               description: unique claim id of the social media platform.
 *               example: 10
 *             contentId:
 *               type: string
 *               description: unique content id of the social media platform.
 *               example: 10
 *             licenseName:
 *               type: string
 *               description: license name
 *               example: Erwin Smith final words
 *             creatorNames:
 *               type: array
 *               description: creator names.
 *               example: ["Ryan", "James"]
 *             socialMediaName:
 *               type: string
 *               description: social media company name.
 *               example: youtube
 *       ReturnedReportItem:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   decisionOfRuling:
 *                     type: string
 *                     description: decision of the ruling on our system.
 *                     example: no action needed.
 *                   recommendedLink:
 *                       type: string
 *                       description: the link of recommended license.
 *                   burnedLicense:
 *                     type: object
 *                     properties:
 *                         ownerAddress:
 *                             type: string
 *                             description: wallet address of the owner
 *                         sellerAddress:
 *                             type: string
 *                             description: wallet address of the seller
 *                         licenseName:
 *                             type: string
 *                             description: license name burned
 *                         sellerName:
 *                             type: string
 *                             description: artist name
 *                         price:
 *                             type: string
 *                             description: price of the license
 *                     description: information of the burned license.
 *               - $ref: '#/components/schemas/ReportItem'
 *       NewReportItem:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   active:
 *                     type: integer
 *                     description: if the license is inappropriated.
 *                     example: 1.
 *                   storedTime:
 *                     type: integer
 *                     description: stored time on blockchain.
 *                     example: 1236542.
 *               - $ref: '#/components/schemas/ReturnedReportItem'
 *       ReportItemByOneUser:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                     description: user id of the social platform.
 *                     example: james.liu.vectorspace@gmail.com
 *               - $ref: '#/components/schemas/ReportItem'
 *       ReportItemBySeveralUser:
 *           allOf:
 *               - type: object
 *                 properties:
 *                   userIds:
 *                     type: array
 *                     example: ["james-1@gmail.com", "james-2@gmail.com"]
 *               - $ref: '#/components/schemas/ReportItem'
 */

const router = require("express").Router();
const {
  cronJob,
  reportClaim,
  reportInappropriate,
  reportAppealBySocialMedia,
  reportAppealByUser,
  reportBurnedLicenseByUser,
  reportBurnedLicenseBySocialMedia,
  reportClaimBySeveralUserIds,
  getLicenseReport,
  reportProfile,
} = require("../controller/report");

/**
 * @swagger
 * /report/license/{accountAddress}:
 *   get:
 *     summary: Retrieve all reported licenses
 *     tags:
 *       - Report
 *     parameters:
 *      - in: path
 *        name: accountAddress
 *        schema:
 *          type: string
 *        required: true
 *        description: wallet address.
 *     description: Retrieve all reported licenses
 *     responses:
 *       200:
 *         description: all reported licenses.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   success:
 *                       type: boolean
 *                       example: true
 *                   msg:
 *                       type: string
 *                       example: success
 *                   data:
 *                       type: array
 *                       items:
 *                           type: object
 *                           properties:
 *                               accountAddress:
 *                                   type: string
 *                               licenseName:
 *                                   type: string
 *                               sellerName:
 *                                   type: string
 *                               contentId:
 *                                   type: string
 *                               userId:
 *                                   type: string
 *                               action:
 *                                   type: string
 *                               status:
 *                                   type: string
 */
router.get("/license/:accountAddress", getLicenseReport);

/**
 * @swagger
 * /report/claim:
 *   post:
 *     summary: Report the claim.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ReportItemByOneUser'
 *     responses:
 *       200:
 *         description: report the claim.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReturnedReportItem'
 *       500:
 *            description: couldnt handle this request
 */
router.post("/claim", reportClaim);

/**
 * @swagger
 * /report/claim/severaluserids:
 *   post:
 *     summary: Report the claim with several users.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ReportItemBySeveralUser'
 *     responses:
 *       200:
 *         description: report the inappropriate.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReturnedReportItem'
 *       500:
 *            description: couldnt handle this request
 */
router.post("/claim/severaluserids", reportClaimBySeveralUserIds);

/**
 * @swagger
 * /report/inappropriate:
 *   post:
 *     summary: Report the inappropriate.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *               type: object
 *               properties:
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   socialMediaName:
 *                       type: string
 *                       example: youtube
 *                   contentId:
 *                       type: string
 *                       example: 10
 *     responses:
 *       200:
 *         description: report the inappropriate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   contentId:
 *                       type: string
 *                       example: 10
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   decisionOfRuling:
 *                       type: string
 *                       example: "Video is marked as inappropriate"
 *       500:
 *            description: something went wrong
 */
router.post("/inappropriate", reportInappropriate);

/**
 * @swagger
 * /report/appeal/socialmedia:
 *   post:
 *     summary: Appeal the claim by social media companies.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *               type: object
 *               properties:
 *                   socialMediaName:
 *                       type: string
 *                       example: youtube
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   contentId:
 *                       type: string
 *                       example: 10
 *     responses:
 *       200:
 *         description: report the inappropriate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   contentId:
 *                       type: string
 *                       example: 10
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   decisionOfRuling:
 *                       type: string
 *                       example: "Video is no longer marked as inappropriate"
 *       500:
 *            description: something went wrong
 */
router.post("/appeal/socialmedia", reportAppealBySocialMedia);

/**
 * @swagger
 * /report/appeal/user:
 *   post:
 *     summary: Appeal the claim by user.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *               type: object
 *               properties:
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   contentId:
 *                       type: string
 *                       example: 10
 *     responses:
 *       200:
 *         description: report the inappropriate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   contentId:
 *                       type: string
 *                       example: 10
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   decisionOfRuling:
 *                       type: string
 *                       example: "Video is no longer marked as inappropriate"
 *       500:
 *            description: something went wrong
 */
router.post("/appeal/user", reportAppealByUser);

/**
 * @swagger
 * /report/burnedlicense/socialmedia:
 *   post:
 *     summary: Report the burned license by social media companies.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *               type: object
 *               properties:
 *                   socialMediaName:
 *                       type: string
 *                       example: youtube
 *                   claimId:
 *                       type: string
 *                       example: 10
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   contentId:
 *                       type: string
 *                       example: 10
 *                   licenseName:
 *                       type: string
 *                       example: Erwin Smith final words
 *                   sellerName:
 *                       type: string
 *                       example: avipatel0408
 *     responses:
 *       200:
 *         description: report the inappropriate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   claimId:
 *                       type: string
 *                       example: 10
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   contentId:
 *                       type: string
 *                       example: 10
 *                   licenseName:
 *                       type: string
 *                       example: Erwin Smith final words
 *                   sellerName:
 *                       type: string
 *                       example: avipatel0408
 *                   action:
 *                       type: string
 *                       example: "Video was marked as using Song Name and Artist but needs further review"
 *       500:
 *            description: something went wrong
 */
router.post("/burnedlicense/socialmedia", reportBurnedLicenseBySocialMedia);

/**
 * @swagger
 * /report/burnedlicense/user:
 *   post:
 *     summary: Report the burned license by user.
 *     tags:
 *       - Report
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *               type: object
 *               properties:
 *                   license:
 *                       type: object
 *                       properties:
 *                           userId:
 *                               type: string
 *                               example: james.liu.vectorspace@gmail.com
 *                           contentId:
 *                               type: string
 *                               example: 10
 *                           licenseName:
 *                               type: string
 *                               example: Erwin Smith final words
 *                           sellerName:
 *                               type: string
 *                               example: avipatel0408
 *     responses:
 *       200:
 *         description: report the inappropriate.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                   userId:
 *                       type: string
 *                       example: james.liu.vectorspace@gmail.com
 *                   contentId:
 *                       type: string
 *                       example: 10
 *                   licenseName:
 *                       type: string
 *                       example: Erwin Smith final words
 *                   sellerName:
 *                       type: string
 *                       example: avipatel0408
 *                   action:
 *                       type: string
 *                       example: "Video was marked as using Song Name and Artist but needs further review"
 *       500:
 *            description: something went wrong
 */
router.post("/burnedlicense/user", reportBurnedLicenseByUser);

router.post("/report-profile", reportProfile);

module.exports = router;
