const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { UserRoles } = require("../interface");
const ListedLicense = require("../model/listedLicenses");
const History = require("../model/history");
const Offer = require("../model/offers");
const SoldLicense = require("../model/soldLicenses");

dotenv.config();

// Middleware for authenticating and authorizing users
const authenticateUser = (req, res, next) => {
  let token = req.headers["authorization"];
  // Check if not token
  if (!token) {
    return res
      .status(401)
      .json({ msg: "Unauthorized: No token provided", success: false });
  }
  const bearer = "Bearer ";
  token = token.replace(bearer, "");
  // Verify token

  try {
    jwt.verify(token, process.env.SECRET_JWT, (error, decoded) => {
      if (error) {
        return res
          .status(401)
          .json({ msg: "Unauthorized: Invalid token", success: false });
      } else {
        const decodedUser = decoded.payload;
        req.user = decodedUser;
        next();
      }
    });
  } catch (err) {
    console.error("something wrong with auth middleware", err.message);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// Middleware for authorizing access based on user role
const authorizeUserRole = async (req, res, next) => {
  try {
    // Check if the user's role matches the required role
    if (req.user.role != UserRoles.Seller) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // User is authorized, proceed to the next middleware or route handler
    next();
  } catch (e) {
    return res
      .status(500)
      .json({ msg: "Something went wrong", success: false });
  }
};

// Middleware for authorizing access based on token id
const authorizeUserByTokenIdOfParam = async (req, res, next) => {
  try {
    // Check if the user's role matches the required role
    if (req.user.role != UserRoles.Seller) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // Check if the user list the license
    let soldLicense = await SoldLicense.findOne({
      sellerId: req.user.sellerId,
      tokenId: req.params.tokenId,
    });
    if (!soldLicense) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // User is authorized, proceed to the next middleware or route handler
    next();
  } catch (e) {
    return res
      .status(500)
      .json({ msg: "Something went wrong", success: false });
  }
};

// Middleware for authorizing access based on license id
const authorizeUserByListedIdOfParam = async (req, res, next) => {
  try {
    // Check if the user's role matches the required role
    if (req.user.role != UserRoles.Seller) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // Check if the user list the license
    let listedLicense = await ListedLicense.findOne({
      sellerId: req.user.sellerId,
      listedId: req.params.listedId,
    });
    if (!listedLicense) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // User is authorized, proceed to the next middleware or route handler
    next();
  } catch (e) {
    return res
      .status(500)
      .json({ msg: "Something went wrong", success: false });
  }
};

// Middleware for authorizing access based on license id
const authorizeUserByListedIdOfBody = async (req, res, next) => {
  try {
    // Check if the user's role matches the required role
    if (req.user.role != UserRoles.Seller) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // Check if the user list the license
    let listedLicense = await ListedLicense.findOne({
      sellerId: req.user.sellerId,
      listedId: req.body.listedId,
    });
    if (!listedLicense) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // User is authorized, proceed to the next middleware or route handler
    next();
  } catch (e) {
    return res
      .status(500)
      .json({ msg: "Something went wrong", success: false });
  }
};

// Middleware for authorizing access based on offer id
const authorizeUserByOfferId = async (req, res, next) => {
  try {
    // Check if the user's role matches the required role
    if (req.user.role != UserRoles.Seller) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // Check if the user list the license
    let offer = await Offer.findOne({ offerId: req.params.offerId });
    let listedLicense = await ListedLicense.findOne({
      sellerId: req.user.sellerId,
      listedId: offer.listedId,
    });
    if (!listedLicense) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // User is authorized, proceed to the next middleware or route handler
    next();
  } catch (e) {
    return res
      .status(500)
      .json({ msg: "Something went wrong", success: false });
  }
};

// Middleware for authorizing access based on history id
const authorizeUserByHistoryId = async (req, res, next) => {
  try {
    // Check if the user's role matches the required role
    if (req.user.role != UserRoles.Seller) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // Check if the user list the license
    let history = await History.findOne({ historyId: req.params.historyId });
    let listedLicense = await ListedLicense.findOne({
      sellerId: req.user.sellerId,
      listedId: history.listedId,
    });
    if (!listedLicense) {
      return res
        .status(403)
        .json({ msg: "Forbidden: Access denied", success: false });
    }

    // User is authorized, proceed to the next middleware or route handler
    next();
  } catch (e) {
    return res
      .status(500)
      .json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  authenticateUser,
  authorizeUserRole,
  authorizeUserByTokenIdOfParam,
  authorizeUserByListedIdOfParam,
  authorizeUserByListedIdOfBody,
  authorizeUserByHistoryId,
  authorizeUserByOfferId,
};
