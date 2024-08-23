const router = require("express").Router();
const {
  authenticateUser,
  authorizeUserByListedIdOfBody,
  authorizeUserByOfferId,
} = require("../middleware/auth");
const {
  getHistoryByListedId,
  getSaleDetails,
  getOfferDetails,
  getAllActivities,
  getAllAccounts,
} = require("../controller/history");

// returns all histories for specific listed license
router.post(
  "/license",
  authenticateUser,
  authorizeUserByListedIdOfBody,
  getHistoryByListedId
);

// returns all sale details for specific listed license
router.post("/sale-details", authenticateUser, getSaleDetails);

// returns all offer histories for specific listed license
router.get(
  "/offer-details/:offerId/:licensingType",
  authenticateUser,
  authorizeUserByOfferId,
  getOfferDetails
);

router.post("/all-activities", authenticateUser, getAllActivities);

router.post("/all-accounts", authenticateUser, getAllAccounts);

module.exports = router;
