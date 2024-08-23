const {
  AmlReviewTypes,
  IdenfyReview,
  AutoReviewTypes,
  UserRoles,
} = require("../interface");
const Idenfy = require("../model/idenfy");
const io = require("../io").io();
const User = require("../model/user");
const { default: axios } = require("axios");
const { SELLER_IDX, BUYER_IDX } = require("../config");
const { generateJwtToken } = require("../utils");

const createToken = () => {
  const apiKey = "FfIvyXEKp9E";
  const apiSecret = "nCdrxjdiRkgZhiaFrilS";
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString(
    "base64"
  );
  return credentials;
};

const getBeneficiaries = async (companyId) => {
  try {
    const credentials = createToken();
    const idenfyRes = await axios({
      url: `https://ivs.idenfy.com/kyb/forms/${companyId}/beneficiaries/`,
      method: "get",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
    const beneficiaryInfo = idenfyRes.data.find(
      (item) => item.beneficiaryType == "CEO"
    );
    return beneficiaryInfo;
  } catch (e) {
    console.log("error in getting beneficiaries", e);
    // res.status(500).json({ msg: "Something went wrong", success: false });
    return null;
  }
};

const companySubmit = async (req, res) => {
  try {
    const { id, submissionTime, clientId, externalRef } = req.body;
    const accAddr = clientId.substring(0, clientId.length - SELLER_IDX.length);
    const userRole = clientId.includes(SELLER_IDX)
      ? UserRoles.Seller
      : UserRoles.Buyer;
    let idenfyData = await Idenfy.findOne({
      id: { $regex: id, $options: "i" },
      clientId: { $regex: clientId, $options: "i" },
      accountAddress: { $regex: accAddr, $options: "i" },
      userRole,
    });
    const beneficiary = await getBeneficiaries(id);

    if (idenfyData) {
      idenfyData.id = id;
      idenfyData.submissionTime = submissionTime;
      idenfyData.externalRef = externalRef;
      idenfyData.status = IdenfyReview.Pending;
      idenfyData.accountAddress = accAddr;
      idenfyData.userRole = userRole;
      idenfyData.country = beneficiary.info?.country;
      idenfyData.directorName =
        beneficiary.info.name + beneficiary.info.surname;
      idenfyData.directorEmail = beneficiary.info.email;

      idenfyData = await idenfyData.save();
      res
        .status(200)
        .json({ msg: "Already Stored", success: false, data: idenfyData });
    } else {
      idenfyData = await Idenfy.create({
        id,
        submissionTime,
        clientId,
        externalRef,
        status: IdenfyReview.Pending,
        accountAddress: accAddr,
        userRole,
        country: beneficiary.info?.country,
        directorName: beneficiary.info.name + beneficiary.info.surname,
        directorEmail: beneficiary.info.email,
      });

      const user = await User.findOne({
        accountAddress: {
          $regex: accAddr,
          $options: "i",
        },
      });

      const token = await generateJwtToken(user);

      io.emit("idenfy-callback", {
        accountAddress: accAddr,
        accessToken: token,
      });
      res.status(200).json({ msg: "Success", success: true, data: idenfyData });
    }
  } catch (e) {
    console.log("error in company submit", e);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

const companyReview = async (req, res) => {
  try {
    const {
      id,
      companyName,
      registrationNumber,
      approvalStatus,
      denyReason,
      statusChangedBy,
      amlComment,
      sanctionsCheckStatus,
      sanctionsStatusSetBy,
      sanctionsStatusSetAt,
      companyCheck,
      beneficiaries,
      shareholderCheck,
      negativeNewsComment,
      negativeNewsStatus,
      newsStatusSetBy,
      newsStatusSetAt,
      negativeNewsCheck,
      clientId,
      externalRef,
      relatedClientScanRefs,
    } = req.body;

    const accAddr = clientId.substring(0, clientId.length - SELLER_IDX.length);
    const userRole = clientId.includes(SELLER_IDX)
      ? UserRoles.Seller
      : UserRoles.Buyer;

    let idenfyData = await Idenfy.findOne({
      id: { $regex: id, $options: "i" },
      clientId: { $regex: clientId, $options: "i" },
      accountAddress: { $regex: accAddr, $options: "i" },
      userRole,
    });
    let user;

    if (idenfyData) {
      switch (approvalStatus) {
        case AutoReviewTypes.Approved:
        case AutoReviewTypes.Denied:
          user = await User.findOne({
            accountAddress: {
              $regex: accAddr,
              $options: "i",
            },
          });

          if (approvalStatus == AutoReviewTypes.Approved) {
            idenfyData.status = IdenfyReview.Business;
            idenfyData.companyName = companyName;
            idenfyData.registrationNumber = registrationNumber;
          } else {
            idenfyData.status = IdenfyReview.NoBusiness;
          }
          idenfyData.accountAddress = accAddr;
          idenfyData.userRole = userRole;

          await idenfyData.save();

          break;
        default:
          idenfyData.status = IdenfyReview.NoBusiness;
          await idenfyData.save();
          break;
      }
      const token = await generateJwtToken(user);
      io.emit("idenfy-callback", {
        accountAddress: accAddr,
        accessToken: token,
      });
      res.status(200).json({ msg: "Success", success: true, data: idenfyData });
    } else {
      res
        .status(200)
        .json({ msg: "Not Found Company Submits", success: false });
    }
  } catch (e) {
    console.log("error in company review", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const companyAmiReview = async (req, res) => {
  try {
    const {
      amlReviewSubjectType,
      id,
      companyId,
      negativeNewsComment,
      negativeNewsStatus,
      newsStatusSetBy,
      newsStatusSetAt,
      amlComment,
      pepsCheckStatus,
      pepsStatusSetBy,
      pepsStatusSetAt,
      sanctionsCheckStatus,
      sanctionsStatusSetBy,
      sanctionsStatusSetAt,
    } = req.body;

    let idenfyData = await Idenfy.findOne({ id });
    if (idenfyData) {
      switch (amlReviewSubjectType) {
        case AmlReviewTypes.Company:
          idenfyData.status = IdenfyReview.Business;
          break;
        case AmlReviewTypes.Beneficiary:
        case AmlReviewTypes.Shareholder:
          idenfyData.status = IdenfyReview.NoBusiness;
          break;
        default:
          idenfyData.status = IdenfyReview.NoBusiness;
          break;
      }
      await idenfyData.save();

      res.status(200).json({ msg: "Success", success: true, data: idenfyData });
    } else {
      res
        .status(200)
        .json({ msg: "Not Found Company Submits", success: false });
    }
  } catch (e) {
    console.log("error in company ami review", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const unlinkBusinessAcc = async (req, res) => {
  try {
    const { accountAddress, idenfy } = req.body;
    await Idenfy.findOneAndDelete({
      accountAddress: { $regex: accountAddress, $options: "i" },
      userRole: idenfy.userRole,
    });
    const user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    const token = await generateJwtToken(user);

    res.status(200).json({
      msg: "unlinked successfully",
      success: true,
      data: { accessToken: token },
    });
  } catch (e) {
    console.log("error in unlinking business account", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const createIdenfySession = async (req, res) => {
  try {
    const { accountAddress, userRole } = req.body;
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    if (user) {
      const clientId =
        accountAddress + (userRole == UserRoles.Buyer ? BUYER_IDX : SELLER_IDX);
      const credentials = createToken();
      const idenfyRes = await axios({
        url: `https://ivs.idenfy.com/kyb/tokens/`,
        method: "post",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        data: { tokenType: "FORM", clientId },
      });
      res.status(200).json({
        msg: "successfully created session",
        data: idenfyRes.data.tokenString,
        success: true,
      });
    } else {
      res.status(200).json({ msg: "User Not Found", success: false });
    }
  } catch (e) {
    console.log("error in creating idenfy session", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const reLinkBusinessAcc = async (req, res) => {
  try {
    const { accountAddress } = req.body;
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });

    if (user) {
      const apiKey = "FfIvyXEKp9E";
      const apiSecret = "nCdrxjdiRkgZhiaFrilS";
      const credentials = Buffer.from(
        `${apiKey}:${apiSecret}`,
        "utf8"
      ).toString("base64");
      const idenfyApi = `https://ivs.idenfy.com/kyb/tokens/`;
      const idenfyRes = await axios({
        url: idenfyApi,
        method: "post",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        data: { tokenType: "FORM", clientId: accountAddress },
      });
      res.status(200).json({
        msg: "successfully created session",
        data: idenfyRes.data.tokenString,
        success: true,
      });
    } else {
      res.status(200).json({ msg: "User Not Found", success: false });
    }
  } catch (e) {
    console.log("error in relinking business", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  companySubmit,
  companyReview,
  companyAmiReview,
  createIdenfySession,
  unlinkBusinessAcc,
  reLinkBusinessAcc,
  getBeneficiaries,
};
