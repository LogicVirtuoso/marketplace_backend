const router = require("express").Router();
const {
  getMyOffersForBuyer,
  getMyOffersOfSeller,
  getMadeOffers,
  getReceivedOffers,
  acceptOfferBySeller,
  placeCounterOfferBySeller,
  withdrawCounterOffer,
  rejectOfferBySeller,
  editCountOffer,
  getTotalOffers,
} = require("../controller/offers");
const { authenticateUser } = require("../middleware/auth");

router.get("/buyer-offer/:accountAddress/:listedId", getMyOffersForBuyer);

router.get("/seller-offer/:listedId/:licensingType", getMyOffersOfSeller);

router.get("/made-offer/:sellerId/:accountAddress", getMadeOffers);

router.get("/received-offer/:sellerId/:accountAddress", getReceivedOffers);

router.get("/reject-by-seller/:offerId", authenticateUser, rejectOfferBySeller);

router.post("/accept", authenticateUser, acceptOfferBySeller);

router.post("/counter-by-seller", authenticateUser, placeCounterOfferBySeller);

router.post("/withdraw-counter-offer", authenticateUser, withdrawCounterOffer);

router.post("/edit-counter-offer", authenticateUser, editCountOffer);

router.post("/sale-total-offers", authenticateUser, getTotalOffers);

module.exports = router;
