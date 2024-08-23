const crypto = require("crypto");
const router = require("express").Router();
const {
  companySubmit,
  companyReview,
  companyAmiReview,
  createIdenfySession,
  unlinkBusinessAcc,
  reLinkBusinessAcc,
} = require("../controller/idenfy");

function verifyPostData(req, res) {
  const callbackSigningKey = "nitrility-2023";
  const payload = req.body;
  const signature = req.headers["idenfy-signature"];
  if (!payload || payload.length === 0) {
    return res.status(400).send("Request body empty.");
  }

  if (!signature) {
    return res.status(400).send("Idenfy-Signature header missing.");
  }

  const hmac = crypto.createHmac("sha256", callbackSigningKey);
  hmac.update(JSON.stringify(payload));
  const digest = hmac.digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return res
      .status(400)
      .send("Request body digest did not match Idenfy-Signature header.");
  } else {
    return res.status(200).send("Success");
  }
}

router.post("/company-submit", companySubmit);
router.post("/company-aml-review", companyAmiReview);
router.post("/company-review", companyReview);

router.post("/middleware-testing", verifyPostData);

router.post("/create-session", createIdenfySession);

router.post("/unlink", unlinkBusinessAcc);

router.post("/relink", reLinkBusinessAcc);

module.exports = router;
