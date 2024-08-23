const router = require("express").Router();
const { uploadCSV, readCSV } = require("../controller/licenseChecker");

router.post("/upload-csv", uploadCSV);
router.post("/read-csv", readCSV);
module.exports = router;
