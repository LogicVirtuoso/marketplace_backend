const router = require("express").Router();
const {
  getSigninHistory,
  logoutHistory,
} = require("../controller/loggedUsers");

router.get("/signin-history/:accountAddress", getSigninHistory);

router.get("/logout-history/:loggedId", logoutHistory);

module.exports = router;
