const router = require("express").Router();
const {authenticateUser} = require("../middleware/auth");

const {
  searchPublicSalesDatabase,
} = require("../controller/publicSalesDatabase");

router.post("/search", searchPublicSalesDatabase);
module.exports = router;
