const router = require("express").Router();
const {
  twitchLinking,
  instagramLinking,
} = require("../controller/socialLinking");

router.post("/twitch", twitchLinking);
router.post("/instagram", instagramLinking);

module.exports = router;
