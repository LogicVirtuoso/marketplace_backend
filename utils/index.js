const { EXPIRATION_TIME } = require("../config");
const { LicensingTypes, PlatformTypes, UserRoles } = require("../interface");
const { BigNumber, ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const SellerData = require("../model/sellerData");
const Idenfy = require("../model/idenfy");
const geoip = require("geoip-lite");

function sendError(res, options) {
  const code = options && options.code ? options.code : 400;

  let message = options && options.msg ? options.msg : null;
  let fm = "Unknown error";

  if (message !== null && message !== undefined) {
    if (
      message.length &&
      typeof message[0] === "object" &&
      message[0].msg &&
      message[0].param
    ) {
      fm = message[0].msg;
    } else if (typeof message === "string") {
      fm = message;
    } else if (typeof message === "object") {
      if (message.code && message.severity) {
        fm = message.severity + " - " + message.code;
      } else if (message.msg) {
        fm = message.msg;
      } else if (message.message) {
        fm = message.message;
      }
    }
  }
  if (!res.headersSent) {
    if (res) {
      res.status(code).json({ msg: fm });
    }
  }
}

const getSyncData = (license, licensingType) => {
  try {
    let syncData;
    switch (licensingType) {
      case LicensingTypes.Creator:
        syncData = license.signingData.creator;
        break;
      case LicensingTypes.Advertisement:
        syncData = license.signingData.advertisement;
        break;
      case LicensingTypes.Movie:
        syncData = license.signingData.movie;
        break;
      case LicensingTypes.TvSeries:
        syncData = license.signingData.tvSeries;
        break;
      case LicensingTypes.AiTraining:
        syncData = license.signingData.aiTraining;
        break;
      case LicensingTypes.VideoGame:
        syncData = license.signingData.videoGame;
        break;
      default:
        throw new Error("Invalid licensing type");
    }
    return syncData;
  } catch (e) {
    throw new Error(e);
  }
};

function convertToBigNumber(obj) {
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      convertToBigNumber(obj[key]);
    } else if (typeof obj[key] === "number" && !Number.isInteger(obj[key])) {
      // Convert decimal numbers to a string representing the smallest unit (e.g., wei for ether)
      obj[key] = ethers.utils.parseEther(obj[key].toString());
    } else if (typeof obj[key] === "number") {
      // Convert integer numbers directly to BigNumber
      obj[key] = BigNumber.from(obj[key]);
    }
  }
}

const getTemplateData = (data) => {
  return {
    fPrice: ethers.utils.parseEther(data.fPrice.toString()).toString(),
    sPrice: ethers.utils.parseEther(data.sPrice.toString()).toString(),
    tPrice: ethers.utils.parseEther(data.tPrice.toString()).toString(),
    listingFormatValue: data.listingFormatValue,
    totalSupply: data.totalSupply,
    infiniteSupply: data.infiniteSupply,
    infiniteListingDuration: data.infiniteListingDuration,
    infiniteExclusiveDuration: data.infiniteExclusiveDuration,
    accessLevel: data.accessLevel,
    listingStartTime: data.listingStartTime,
    listingEndTime: data.listingEndTime,
    exclusiveEndTime: data.exclusiveEndTime,
    discountCode: {
      ...data.discountCode,
      percentage: ethers.utils
        .parseEther(data.discountCode.percentage.toString())
        .toString(),
      fixedAmount: ethers.utils
        .parseEther(data.discountCode.fixedAmount.toString())
        .toString(),
    },
    listed: data.listed,
    signature: data.signature,
  };
};

function isSpotifyID(id) {
  const isSpotifyArtistId = /^[a-zA-Z0-9]{22}$/.test(id);
  if (isSpotifyArtistId) {
    return true;
  } else return false;
}

const getIdenfiesOfUser = async (accAddr) => {
  let idenfiesOfSeller = await Idenfy.find({
    accountAddress: { $regex: accAddr, $options: "i" },
    userRole: UserRoles.Seller,
  });

  let idenfyOfBuyer = await Idenfy.findOne({
    accountAddress: { $regex: accAddr, $options: "i" },
    userRole: UserRoles.Buyer,
  });

  return {
    seller: idenfiesOfSeller,
    buyer: idenfyOfBuyer,
  };
};

const generateJwtToken = async (user) => {
  let sellerData;
  const accountData = user.sellerAccountData.find(
    (account) => account.platformTitle === PlatformTypes.spotify
  );
  if (accountData.associatedEmail) {
    sellerData = await SellerData.findOne({
      email: { $regex: accountData.associatedEmail, $options: "i" },
      platformTitle: PlatformTypes.spotify,
    });
  }
  const token = await jwt.sign(
    {
      payload: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        accountAddress: user.accountAddress,
        sellerId: sellerData?.sellerId,
        sellerName: sellerData?.sellerName,
        role: user.role,
        idenfies: await getIdenfiesOfUser(user.accountAddress),
        loggedTime: Date.now(),
      },
    },
    process.env.SECRET_JWT,
    {
      algorithm: "HS256",
      expiresIn: `${EXPIRATION_TIME}s`,
    }
  );
  return token;
};

const getPublicIP = (req) => {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  if (ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  return ip;
};

const getLoggedLocationInfo = (req) => {
  let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  if (ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  const geo = geoip.lookup(ip);
  if (geo) {
    return {
      ip: ip,
      location: `${geo.city}, ${geo.country}`,
      region: geo.region,
    };
  } else {
    return null;
  }
};

module.exports = {
  sendError,
  getSyncData,
  convertToBigNumber,
  getTemplateData,
  isSpotifyID,
  generateJwtToken,
  getPublicIP,
  getLoggedLocationInfo,
};
