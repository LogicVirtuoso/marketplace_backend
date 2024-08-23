const router = require("express").Router();
const { authenticateUser, authorizeUserByHistoryId } = require("../middleware/auth");

const {
    getChangedLicenseData
} = require("../controller/licenseChanges");

// returns license change for specific license
router.get("/:historyId", authenticateUser, authorizeUserByHistoryId, getChangedLicenseData);

module.exports = router;
