const Admin = require("../../model/admin");
const User = require("../../model/user");
const PreSignUp = require("../../model/preSignup");

const msgs = require("./user.msgs");
const sendEmail = require("../../email/email.send");
const templates = require("../../email/email.templates");
const fs = require("fs-extra");
const path = require("path");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");
const {
  EXPIRATION_TIME,
  CONTRACT_FACTORY_ADDRESS,
  RPC_URL,
} = require("../../config");
const ethers = require("ethers");
const { getDigitalCode } = require("node-verification-code");
const SpotifyWebApi = require("spotify-web-api-node");
const { PlatformTypes, UserRoles } = require("../../interface");
const UAParser = require("ua-parser-js");

const {
  createInitialPublicProfile,
  savePublicProfile,
  getPublicProfile,
  updateBuyerPlatform,
  updateAddressHandler,
  updateSellerPlatform,
  getBuyerPlatform,
  getSellerPlatform,
  getCurrentAccount,
  getPrivateProfileData,
  getCollectionData,
  updatePublicProfile,
  deleteCollection,
  removeCollection,
  getSellerData,
  updateSellerProfile,
  getSocialAccounts,
  addProfileViewer,
} = require("./profile");

const { COMPANY_ACCOUNT_PRIVATE_KEY } = require("../../config");
const facotryAbi = require("../../abi/NitrilityFactory.json");

const { findCorrectArtist } = require("../spotify");
const SellerData = require("../../model/sellerData");
const ListedLicenses = require("../../model/listedLicenses");
const {
  sendError,
  generateJwtToken,
  getLoggedLocationInfo,
} = require("../../utils");
const LoggedUsers = require("../../model/loggedUsers");

const initialSellerVerifications = [
  {
    platformTitle: "Spotify",
    sellerId: null,
    associatedEmail: null,
    verificationCode: null,
    confirmed: false,
  },
  {
    platformTitle: "USPTO",
    sellerId: null,
    associatedEmail: null,
    verificationCode: null,
    confirmed: false,
  },
  {
    platformTitle: "Apple Music",
    sellerId: null,
    associatedEmail: null,
    verificationCode: null,
    confirmed: false,
  },
  {
    platformTitle: "CruncyRoll",
    sellerId: null,
    associatedEmail: null,
    verificationCode: null,
    confirmed: false,
  },
];

const initialBuyerAccounts = [
  {
    platformTitle: "YouTube",
    accounts: [],
  },
  {
    platformTitle: "Instagram",
    accounts: [],
  },
  {
    platformTitle: "TikTok",
    accounts: [],
  },
  {
    platformTitle: "Twitch",
    accounts: [],
  },
  {
    platformTitle: "Facebook",
    accounts: [],
  },
  {
    platformTitle: "Twitter / X",
    accounts: [],
  },
];

const initialSellerAccounts = [
  {
    platformTitle: "Spotify",
    sellerId: null,
    associatedEmail: null,
  },
  {
    platformTitle: "USPTO",
    sellerId: null,
    associatedEmail: null,
  },
  {
    platformTitle: "Apple Music",
    sellerId: null,
    associatedEmail: null,
  },
  {
    platformTitle: "CruncyRoll",
    sellerId: null,
    associatedEmail: null,
  },
];

const adminSignUp = async (req, res) => {
  const { email, password, userName } = req.body;
  let admin = await Admin.findOne({ email });
  if (admin) {
    res.status(200).json({ msg: "already sign up", success: false });
  } else {
    try {
      admin = await Admin.create({
        email,
        password,
        userName,
        role: "admin", //customer
        status: 1,
      });
      res.status(200).json({ msg: "success", success: true, data: admin });
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "couldnt signup now", success: false });
    }
  }
};

const adminSignIn = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (admin) {
    if (
      admin?.role === "admin" ||
      (password === admin.password && admin?.status === 0)
    ) {
      const token = await jwt.sign(
        {
          payload: {
            id: admin._id,
            email: admin.email,
            password: admin.password,
            userName: admin.userName,
            avatar: admin.avatar,
            role: admin.role,
            status: admin.status,
            loggedTime: Date.now(),
          },
        },
        process.env.SECRET_JWT,
        {
          algorithm: "HS256",
          expiresIn: `${EXPIRATION_TIME}s`,
        }
      );
      res.status(200).json({ msg: "success", success: true, data: token });
    } else {
      if (password === admin.password) {
        res.status(200).json({
          msg: `Your account is ${
            admin?.status === 1 ? "pending" : "suspended"
          }`,
          success: false,
        });
      } else {
        res.status(200).json({
          msg: "please fill out with correct email and password",
          success: false,
        });
      }
    }
  } else {
    res.status(200).json({ msg: "couldnt find the user", success: false });
  }
};

const signInByMagic = async (req, res) => {
  try {
    const { email, accountAddress, deviceInfo } = req.body;
    let newUser = true,
      loggedUser = null;
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });

    const locationInfo = getLoggedLocationInfo(req);
    if (user) {
      newUser = false;
    } else {
      user = await User.create({
        accountAddress: accountAddress,
        userName: "",
        email: email,
        confirmed: true,
        shutDownStatus: {
          isShutDowned: false,
          shutDownedTime: null,
        },
        role: UserRoles.Buyer,
        recordLabel: null,
        sellerAccountData: initialSellerAccounts,
        buyerAccountData: initialBuyerAccounts,
        favoritedLicenseIds: [],
        followedAccounts: [],
        notificationSettings: {
          follower: true,
          sales: true,
          announcements: true,
        },
        verifications: initialSellerVerifications,
      });
    }

    const token = await generateJwtToken(user);

    if (locationInfo) {
      const parser = new UAParser();
      parser.setUA(deviceInfo.userAgent);
      const result = parser.getResult();

      const browserName = result.browser.name;
      const browserVersion = result.browser.major;
      const osName = result.os.name;
      const osVersion = result.os.version;

      const parsedInfo = `${browserName} ${browserVersion} on ${osName} ${osVersion}`;
      loggedUser = await LoggedUsers.create({
        accountAddress,
        ipAddress: locationInfo.ip,
        location: locationInfo.location,
        status: locationInfo.status,
        deviceInfo: parsedInfo,
      });
    }

    res.status(200).json({
      success: true,
      msg: "Successfully logged in.",
      data: { accessToken: token, newUser, loggedId: loggedUser?._id },
    });
  } catch (e) {
    console.log("error in signinng by magic", e);
    sendError(res, { msg: e });
  }
};

const getAllArtists = async (req, res) => {
  try {
    const artists = await SellerData.find();
    res.status(200).json({ msg: "success", success: true, data: artists });
  } catch (e) {
    console.log("error in getting all artists", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// get contact info
const getContactInfoOfOffer = async (req, res) => {
  const { accountAddress } = req.params;
  try {
    let userInfo = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    if (userInfo) {
      res
        .status(200)
        .json({ msg: "success", success: true, data: userInfo.email });
    } else {
      res.status(200).json({ msg: "could not read user info", success: false });
    }
  } catch (e) {
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

// check if the user favorited the license
const checkIfLiked = async (req, res) => {
  const { accountAddress, listedId } = req.body;
  try {
    let userInfo = await User.findOne({ accountAddress });
    if (userInfo) {
      // check if favoritedLicenses contain listedId
      if (userInfo.favoritedLicenseIds.some((id) => id === listedId))
        res.status(200).json({
          msg: "success",
          success: true,
        });
      else res.status(200).json({ msg: "didn't like", success: false });
    } else {
      res.status(200).json({ msg: "could not read user info", success: false });
    }
  } catch (e) {
    console.error("__checkIfLiked Error", e);
    res.status(500).json({ msg: "checkIfLiked Error", success: false });
  }
};

// like the license
const likeOrDislikeLicense = async (req, res) => {
  const { accountAddress, listedId } = req.body;
  try {
    let userInfo = await User.findOne({ accountAddress });

    if (userInfo) {
      let arr = userInfo.favoritedLicenseIds;
      const idIndex = arr.findIndex((id) => id == listedId);

      if (idIndex !== -1) {
        arr.splice(idIndex, 1);
      } else {
        arr.push(listedId);
      }
      userInfo.favoritedLicenseIds = arr;
      userInfo.markModified("favoritedLicenseIds");
      userInfo = await userInfo.save();

      const favorites = await ListedLicenses.find({ listedId: { $in: arr } });
      res.status(200).json({
        success: true,
        message: "success",
        data: favorites,
      });
    } else {
      res.status(200).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    console.error("Error toggling favorite license:", error);
    return {
      success: false,
      message: "An error occurred while toggling favorite license",
    };
  }
};

// Gets all the buyers
const getAllBuyers = async (req, res) => {
  try {
    const buyers = await User.find({ sellerType: "Buyer/Creator" });
    res.status(200).json({ success: true, msg: "success", data: buyers });
  } catch (e) {
    console.error("Error: get the all buyers", e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

// Gets all the customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Admin.find({ role: { $ne: "admin" } });
    res.status(200).json({ success: true, msg: "success", data: customers });
  } catch (e) {
    console.error("Error: get the all customers", e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const deleteBuyerById = async (req, res) => {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    const users = await User.find({ sellerType: "Buyer/Creator" });
    res.status(200).json({ success: true, msg: "success", data: users });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const deleteArtistById = async (req, res) => {
  const { id } = req.params;
  try {
    await User.findByIdAndDelete(id);
    const users = await User.find({ sellerType: "Seller/Artist" });
    res.status(200).json({ success: true, msg: "success", data: users });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const deleteCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    await Admin.findByIdAndDelete(id);
    const admins = await Admin.find({ role: { $ne: "admin" } });
    res.status(200).json({ success: true, msg: "success", data: admins });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const updateProfileByAdmin = async (req, res) => {
  const {
    id,
    userName,
    email,
    address,
    country,
    city,
    state,
    zipcode,
    avatar,
  } = req.body;
  try {
    let user = null;
    if (avatar) {
      const stored = await User.findById(id);
      if (stored?.image) {
        try {
          fs.unlinkSync(
            `.${stored?.image?.slice(
              stored?.image?.search("/uploads/"),
              stored?.image?.length
            )}`
          );
        } catch (e) {
          console.log(e);
        }
      }
      user = await User.findByIdAndUpdate(id, {
        userName,
        email,
        address,
        country,
        city,
        state,
        zipcode,
        image: avatar,
      });
    } else {
      user = await User.findByIdAndUpdate(id, {
        userName,
        email,
        address,
        country,
        city,
        state,
        zipcode,
      });
    }
    res.status(200).json({ success: true, msg: "success", data: user });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const updateCustomerProfileByAdmin = async (req, res) => {
  const { id, userName, email, password, status, avatar } = req.body;
  try {
    let admin = null;
    if (avatar) {
      admin = await Admin.findByIdAndUpdate(id, {
        userName,
        email,
        password,
        status,
        avatar,
      });
    } else {
      admin = await Admin.findByIdAndUpdate(id, {
        userName,
        email,
        password,
        status,
      });
    }
    res.status(200).json({ success: true, msg: "success", data: admin });
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const createProfileByAdmin = async (req, res) => {
  const { userName, email, accountAddress, sellerType, avatar } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      await User.create({
        accountAddress,
        email,
        shutDownStatus: {
          isShutDowned: false,
          shutDownedTime: null,
        },
        recordLabel: null,
        sellerAccountData: initialSellerAccounts,
        buyerAccountData: initialBuyerAccounts,
        favoritedLicenseIds: [],
        followedAccounts: [],
        notificationSettings: {
          follower: true,
          sales: true,
          announcements: true,
        },
        confirmed: false,
      });
      const users = await User.find({ sellerType });
      res.status(200).json({ success: true, msg: "success", data: users });
    } else {
      res.status(200).json({ success: false, msg: "already existed" });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const createCustomerProfileByAdmin = async (req, res) => {
  const { userName, email, password, status, avatar } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      await Admin.create({
        userName,
        email,
        password,
        status: status || 1,
        role: "customer",
        avatar,
      });
      const admins = await Admin.find({ role: { $ne: "admin" } });
      res.status(200).json({ success: true, msg: "success", data: admins });
    } else {
      res.status(200).json({ success: false, msg: "already existed" });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const getUserProfileFromSpotify = async (fullname) => {
  try {
    const tokenRes = await axios({
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      params: {
        grant_type: "client_credentials",
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      auth: {
        username: process.env.SPOTIFY_CLIENT_ID,
        password: process.env.client_secret,
      },
    });
    const token = tokenRes?.data?.access_token;

    if (token) {
      const userRes = await axios({
        url: `https://api.spotify.com/v1/users/${fullname}`,
        method: "get",
        headers: {
          Authorization: "Bearer " + token,
        },
      });
      if (userRes?.data) return userRes?.data;
      else null;
    }
  } catch (err) {
    return null;
  }
};

const sendEmailToCollaborators = async (req, res) => {
  try {
    const { emails, licenseName, imagePath } = req.body;
    const collaborators = emails.split(",");
    collaborators.map(async (email) => {
      await sendEmail(
        email,
        templates.confirmLicenseOwnership(licenseName, imagePath)
      );
    });
    res.status(200).json({ msg: "Sent emails to collabrators", success: true });
  } catch (e) {
    console.log("error in sending emails to collaborators email", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const sendCodeToPersonalEmail = async (req, res) => {
  try {
    const { userName, personalEmail } = req.body;
    const verificationCode = getDigitalCode(6).toString();
    let preUser = await PreSignUp.findOneAndUpdate(
      {
        "buyerVerification.associatedEmail": personalEmail,
      },
      { userName }
    );

    if (preUser) {
      const personalData = preUser.buyerVerification;
      if (personalData.confirmed) {
        res.status(200).json({
          msg: msgs.alreadyConfirmed,
          success: true,
          alreadyConfirmed: true,
        });
        return;
      }
    }

    await sendEmail(
      personalEmail,
      templates.sendVerificationCode(verificationCode)
    );

    if (!preUser) {
      await PreSignUp.create({
        userName,
        buyerVerification: {
          associatedEmail: personalEmail,
          verificationCode: verificationCode,
          confirmed: false,
        },
        sellerVerifications: initialSellerVerifications,
      });
    } else {
      let buyerVerification = preUser.buyerVerification;
      buyerVerification.verificationCode = verificationCode;
      preUser.verificationCodes = buyerVerification;
      preUser.markModified("buyerVerification");
      await preUser.save();
    }
    res
      .status(200)
      .json({ msg: msgs.sentCode, success: true, alreadyConfirmed: false });
  } catch (e) {
    console.log("error in sending code to personal email", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const sendCodeToPlatformEmail = async (req, res) => {
  try {
    const { personalEmail, accountData, platformTitle } = req.body;
    const verificationCode = getDigitalCode(6).toString();
    let preUser = await PreSignUp.findOne({
      "buyerVerification.associatedEmail": personalEmail,
    });

    if (preUser) {
      const platformData = preUser.sellerVerifications.find(
        (item) => item.platformTitle === platformTitle
      );
      if (platformData?.confirmed) {
        res.status(200).json({
          msg: msgs.alreadyConfirmed,
          success: true,
          alreadyConfirmed: true,
        });
        return;
      }
    } else {
      res.status(200).json({ msg: msgs.notFound, success: false });
      return;
    }

    try {
      let sellerData = await SellerData.findOne({
        email: { $regex: accountData.email, $options: "i" },
        platformTitle: PlatformTypes.spotify,
      });

      if (!sellerData) {
        const spotifyApi = new SpotifyWebApi({
          clientId: process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        });
        const token_data = await spotifyApi.clientCredentialsGrant();
        await spotifyApi.setAccessToken(token_data.body.access_token);
        const searchRes = await spotifyApi.searchArtists(
          accountData.display_name
        );
        let searchedArtits = searchRes.body.artists.items;
        searchedArtits = searchedArtits.filter(
          (artist) =>
            artist.name.toLowerCase() === accountData.display_name.toLowerCase()
        );
        if (searchedArtits.length > 0) {
          const artist = await findCorrectArtist(
            accountData.display_name,
            searchedArtits,
            token_data.body.access_token
          );
          if (artist) {
            await sendEmail(
              accountData.email,
              templates.sendVerificationCode(verificationCode)
            );

            sellerData = await SellerData.create({
              platformTitle: PlatformTypes.spotify,
              sellerName: accountData.display_name,
              email: accountData.email,
              sellerId: artist.id,
              avatarPath: artist.images[0]?.url,
            });

            const sellerVerification = preUser.sellerVerifications.map(
              (item) => {
                if (item.platformTitle === platformTitle) {
                  return {
                    ...item,
                    sellerId: sellerData.sellerId,
                    associatedEmail: sellerData.email,
                    verificationCode,
                  };
                } else {
                  return item;
                }
              }
            );
            preUser.sellerVerifications = sellerVerification;
            preUser.markModified("sellerVerifications");
            await preUser.save();

            res.status(200).json({
              msg: msgs.sentCode,
              success: true,
              alreadyConfirmed: false,
            });
          } else {
            res
              .status(200)
              .json({ msg: "This is not artist Acccount", success: false });
          }
        } else {
          res
            .status(200)
            .json({ msg: "This is not artist Acccount", success: false });
        }
      } else {
        await sendEmail(
          accountData.email,
          templates.sendVerificationCode(verificationCode)
        );
        const sellerVerification = preUser.sellerVerifications.map((item) => {
          if (item.platformTitle === platformTitle) {
            return {
              ...item,
              sellerId: sellerData.sellerId,
              associatedEmail: sellerData.email,
              verificationCode,
            };
          } else {
            return item;
          }
        });
        preUser.sellerVerifications = sellerVerification;
        preUser.markModified("sellerVerifications");
        await preUser.save();
        res.status(200).json({
          msg: msgs.sentCode,
          success: true,
          alreadyConfirmed: false,
        });
      }
    } catch (e) {
      console.log("error in sending email", e);
      res.status(200).json({
        msg: "Could not verify your account",
        success: false,
      });
    }
  } catch (e) {
    console.log("Error in sending the code to platform email", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const checkPersonalCode = async (req, res) => {
  try {
    const { personalEmail, personalCode } = req.body;
    let preUser = await PreSignUp.findOne({
      "buyerVerification.associatedEmail": personalEmail,
    });
    if (preUser) {
      if (Date.now() > preUser.sentTime + EXPIRATION_TIME) {
        const verificationCode = getDigitalCode(6).toString();
        await sendEmail(
          personalEmail,
          templates.sendVerificationCode(verificationCode)
        );
        let buyerVerification = preUser.buyerVerification;
        buyerVerification.verificationCode = verificationCode;
        preUser.buyerVerification = buyerVerification;
        preUser.sentTime = Date.now();
        preUser.markModified("buyerVerification");
        await preUser.save();
        res.status(200).json({ msg: msgs.expiredCode, success: false });
      } else {
        const buyerVerification = preUser.buyerVerification;
        if (buyerVerification.verificationCode === personalCode) {
          buyerVerification.confirmed = true;
          preUser.buyerVerification = buyerVerification;
          preUser.sentTime = Date.now();
          preUser.markModified("buyerVerification");
          await preUser.save();
          res.status(200).json({ msg: msgs.confirmed, success: true });
        } else {
          res.status(200).json({ msg: msgs.invalidCode, success: false });
        }
      }
    } else {
      res.status(200).json({ msg: msgs.notFound, success: false });
    }
  } catch (e) {
    console.log("error in checking the personal code", e);
    res.status(500).json({ msg: msgs.failed, success: false });
  }
};

const sendVerificationCodeToSpotifyEmail = async (req, res) => {
  const { spotifyEmail, accountAddress } = req.body;
  try {
    let user = await User.findOne({
      accountAddress: {
        $regex: accountAddress,
        $options: "i",
      },
      "verifications.platformTitle": PlatformTypes.spotify,
      "verifications.associatedEmail": spotifyEmail,
    });
    if (user) {
      const verificationCode = getDigitalCode(6).toString();
      await sendEmail(
        spotifyEmail,
        templates.sendVerificationCode(verificationCode)
      );
      const verifications = user.verifications.map((item) => {
        if (item.platformTitle === PlatformTypes.spotify) {
          return { ...item, confirmed: false, verificationCode };
        } else {
          return item;
        }
      });
      user.verifications = verifications;
      user.markModified("verifications");
      await user.save();
      res.status(200).json({
        msg: "sent the verification code to your email",
        success: true,
      });
    } else {
      res.status(200).json({ msg: "could not find the user", success: false });
    }
  } catch (e) {
    console.log("error in sending the verification code to spotify email", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const sendVCodeToSpotifyEmail = async (req, res) => {
  const { accountAddress, spotifyData } = req.body;
  try {
    let user = await User.findOne({
      accountAddress: {
        $regex: accountAddress,
        $options: "i",
      },
    });
    if (user) {
      const sellerData = await SellerData.findOne({ email: spotifyData.email });
      const verificationCode = getDigitalCode(6).toString();

      if (!sellerData) {
        try {
          const spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
          });
          const token_data = await spotifyApi.clientCredentialsGrant();
          await spotifyApi.setAccessToken(token_data.body.access_token);
          const searchRes = await spotifyApi.searchArtists(
            spotifyData.display_name
          );
          let searchedArtits = searchRes.body.artists.items;
          searchedArtits = searchedArtits.filter(
            (artist) =>
              artist.name.toLowerCase() ===
              spotifyData.display_name.toLowerCase()
          );
          if (searchedArtits.length > 0) {
            const artist = await findCorrectArtist(
              spotifyData.display_name,
              searchedArtits,
              token_data.body.access_token
            );
            if (artist) {
              await sendEmail(
                spotifyData.email,
                templates.sendVerificationCode(verificationCode)
              );

              await SellerData.create({
                platformTitle: PlatformTypes.spotify,
                sellerName: spotifyData.display_name,
                email: spotifyData.email,
                sellerId: artist.id,
                avatarPath: artist.images[0]?.url,
              });

              const verifications = user.verifications.map((item) => {
                if (item.platformTitle === PlatformTypes.spotify) {
                  return {
                    ...item,
                    associatedEmail: spotifyData.email,
                    sellerId: artist.id,
                    confirmed: false,
                    verificationCode,
                  };
                } else {
                  return item;
                }
              });
              user.markModified("verifications");
              user.verifications = verifications;
              await user.save();
              res.status(200).json({
                msg: "sent the verification code to your email",
                success: true,
              });
            } else {
              res
                .status(200)
                .json({ msg: "This is not artist Acccount", success: false });
            }
          } else {
            res
              .status(200)
              .json({ msg: "This is not artist Acccount", success: false });
          }
        } catch (e) {
          console.log("error in verifying account", e);
          res.status(200).json({
            msg: "Could not verify your account",
            success: false,
          });
        }
      } else {
        await sendEmail(
          spotifyData.email,
          templates.sendVerificationCode(verificationCode)
        );
        const verifications = user.verifications.map((item) => {
          if (item.platformTitle === PlatformTypes.spotify) {
            return {
              ...item,
              associatedEmail: spotifyData.email,
              sellerId: sellerData.sellerId,
              confirmed: false,
              verificationCode,
            };
          } else {
            return item;
          }
        });
        user.markModified("verifications");
        user.verifications = verifications;
        await user.save();
        res.status(200).json({
          msg: "sent the verification code to your email",
          success: true,
        });
      }
    } else {
      res.status(200).json({ msg: "could not find the user", success: false });
    }
  } catch (e) {
    console.log("error in sending the verification code to spotify email", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const verifySellerAccount = async (req, res) => {
  const { accountAddress, verificationCode, platformTitle } = req.body;
  try {
    let user = await User.findOne({
      accountAddress: {
        $regex: accountAddress,
        $options: "i",
      },
    });
    if (user) {
      let bVerified = false;
      let associatedEmail;
      let sellerId;
      const verifications = user.verifications.map((item) => {
        if (
          item.platformTitle === platformTitle &&
          item.verificationCode === verificationCode
        ) {
          bVerified = true;
          associatedEmail = item.associatedEmail;
          sellerId = item.sellerId;
          return { ...item, confirmed: true };
        } else {
          return item;
        }
      });

      if (bVerified) {
        try {
          const sellerAccountData = user.sellerAccountData.map((item) => {
            if (item.platformTitle === platformTitle) {
              return { ...item, associatedEmail, sellerId };
            } else {
              return item;
            }
          });
          user.sellerAccountData = sellerAccountData;
          user.verifications = verifications;
          user.role = UserRoles.Seller;
          user.markModified("verifications");
          user.markModified("sellerAccountData");
          const storedUser = await user.save();
          const token = await generateJwtToken(storedUser);
          await setArtistAddressForSellerId(accountAddress);

          await createInitialPublicProfile(sellerId);
          res.status(200).json({
            msg: "verified successfully",
            success: true,
            data: { accessToken: token },
          });
        } catch (e) {
          console.log("error in setting artist address for id", e);
          res.status(500).json({ msg: "something went wrong", success: false });
        }
      } else {
        res
          .status(200)
          .json({ msg: "invalid verification code", success: false });
      }
    } else {
      res.status(200).json({ msg: "could not find the user", success: false });
    }
  } catch (e) {
    console.log("error in verifying code", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const setArtistAddressForSellerId = async (accountAddress) => {
  try {
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });

    if (!user) {
      throw new Error("User not found for the specified account address.");
    }

    const accountData = user?.sellerAccountData.find(
      (account) => account.platformTitle === PlatformTypes.spotify
    );

    if (!accountData) {
      throw new Error("No Spotify account data found for the user.");
    }

    const spotifyData = await SellerData.findOne({
      email: { $regex: accountData.associatedEmail, $options: "i" },
      platformTitle: PlatformTypes.spotify,
    });

    if (!spotifyData) {
      throw new Error("No Spotify seller data found for the specified email.");
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(COMPANY_ACCOUNT_PRIVATE_KEY, provider);
    const factoryContract = new ethers.Contract(
      CONTRACT_FACTORY_ADDRESS,
      facotryAbi,
      provider
    );
    // Check account balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");

    const factoryWithSigner = factoryContract.connect(wallet);
    const estimatedGasLimit =
      await factoryWithSigner.estimateGas.setArtistAddress(
        spotifyData.sellerId,
        accountAddress
      );
    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    console.log("estimatedGasLimit", estimatedGasLimit);
    // Calculate total transaction cost
    const totalCost = estimatedGasLimit.mul(gasPrice);
    console.log(
      "Estimated transaction cost:",
      ethers.utils.formatEther(totalCost),
      "ETH"
    );

    // Check if the account has enough funds
    if (balance.lt(totalCost)) {
      throw new Error("Insufficient funds for gas * price + value");
    }
    const tx = await factoryWithSigner.setArtistAddress(
      spotifyData.sellerId,
      accountAddress,
      { gasLimit: Math.ceil(estimatedGasLimit.toNumber() * 1.1), gasPrice }
    );
    const receipt = await tx.wait();
    console.log("Transaction successful with hash:", receipt.transactionHash);
    return true;
  } catch (e) {
    console.log("error in setting artist address on smart contract", e);
    return false;
  }
};

// upload image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "images");
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4() + "-" + Date.now() + path.extname(file.originalname));
  },
});

const uploadImage = async (req, res) => {
  if (!fs.existsSync("./uploads/images")) {
    fs.mkdirsSync("./uploads/images");
  }
  let upload = multer({ storage }).single("photo");
  upload(req, res, function (err) {
    try {
      const file = req?.files?.photo;
      const filePath =
        "/uploads/images/" + uuidv4() + "-" + Date.now() + file.name;

      file.mv(`.${filePath}`);
      res.status(200).json(filePath);
    } catch (err) {
      res.status(404).json({ msg: "something went wrong" });
    }
  });
};

const deleteSellerAccount = async (req, res) => {
  const { accountTitle, accountAddress } = req.body;
  try {
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    if (user) {
      const verifications = user.verifications.map((item) => {
        if (item.platformTitle === accountTitle) {
          return {
            ...item,
            confirmed: false,
            sellerId: null,
            associatedEmail: null,
            verificationCode: null,
          };
        } else {
          return item;
        }
      });

      let sellerPlatforms = user.sellerAccountData.map((item) => {
        if (item.platformTitle === accountTitle) {
          return {
            ...item,
            sellerId: null,
            associatedEmail: null,
          };
        } else {
          return item;
        }
      });

      sellerPlatforms = await Promise.all(
        sellerPlatforms.map(async (item) => {
          const sellerData = await SellerData.findOne({
            email: item.associatedEmail,
            platformTitle: PlatformTypes.spotify,
          });
          if (sellerData) {
            return { ...item, accountData: sellerData };
          } else {
            return { ...item, accountData: null };
          }
        })
      );

      user.sellerAccountData = sellerPlatforms;
      user.verifications = verifications;
      user.markModified("verifications");
      user.markModified("sellerAccountData");
      user.role = UserRoles.Buyer;
      user = await user.save();
      const accessToken = await generateJwtToken(user);
      res.status(200).json({
        msg: "success",
        success: true,
        data: { sellerPlatforms, accessToken },
      });
    } else {
      res.status(200).json({ msg: "could not find user", success: true });
    }
  } catch (e) {
    console.log("error in delinking spotify", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const searchArtists = async (req, res) => {
  const { keyword } = req.body;
  try {
    const artists = await SellerData.aggregate([
      {
        $match: {
          sellerName: { $regex: new RegExp(keyword, "i") },
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: artists });
  } catch (e) {
    console.log("error in searching artists", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const checkFollowing = async (req, res) => {
  try {
    const { sellerId, buyerAddress } = req.body;
    let user = await User.findOne({
      accountAddress: { $regex: buyerAddress, $options: "i" },
    });
    if (user) {
      if (user.followedAccounts.some((id) => id === sellerId)) {
        res.status(200).json({ msg: "You are following now", success: true });
      } else {
        res.status(200).json({ msg: "You are not following", success: false });
      }
    } else {
      res.status(500).json({ msg: "Something went wrong", success: false });
    }
  } catch (e) {
    console.log("error in checking following artist", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const updateFollow = async (req, res) => {
  try {
    const { sellerId, buyerAddress } = req.body;
    let user = await User.findOne({
      accountAddress: { $regex: buyerAddress, $options: "i" },
    });
    if (user) {
      let isFollowing = user.followedAccounts.some(
        (id) => id.toLowerCase() == sellerId.toLowerCase()
      );
      user.markModified("followedAccounts");
      if (isFollowing) {
        user.followedAccounts.pull(sellerId);
        await user.save();
        res.status(200).json({ msg: "Unfollowing this artist", success: true });
      } else {
        user.followedAccounts.push(sellerId);
        await user.save();
        res.status(200).json({ msg: "Following Successfully", success: true });
      }
    }
  } catch (e) {
    console.log("error in updating following status", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const getFollowingBuyers = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const users = await User.aggregate([
      {
        $match: {
          followedAccounts: {
            $elemMatch: { $regex: sellerId, $options: "i" },
          },
        },
      },
      {
        $project: {
          _id: 1,
          accountAddress: 1,
          firstName: 1,
          lastName: 1,
          userName: { $concat: ["$firstName", " ", "$lastName"] },
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: users });
  } catch (e) {
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const getUserLegalName = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.status(200).json({
        msg: "success",
        success: true,
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } else {
      res.status(200).json({
        msg: "User Not Found",
        success: false,
        data: null,
      });
    }
  } catch (e) {
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// update user's firstname and lastname
const updateUsername = async (req, res) => {
  const { firstName, lastName } = req.body;
  try {
    let user = await User.findById(req.user.id);
    user.firstName = firstName;
    user.lastName = lastName;
    user = await user.save();
    const token = await generateJwtToken(user);
    res.status(200).json({
      msg: "Updated Successfully",
      success: true,
      data: { accessToken: token },
    });
  } catch (e) {
    console.log("error in updating username", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// update user's buyer account
const updateBuyerMailingInfo = async (req, res) => {
  const { mail, mailingAddress } = req.body;
  try {
    let user = await User.findById(req.user.id);
    user.buyerMailingInfo = {
      mail,
      mailingAddress,
    };
    user.markModified("buyerMailingInfo");
    user = await user.save();
    res.status(200).json({
      msg: "Updated Successfully",
      success: true,
    });
  } catch (e) {
    console.log("updating buyer mailinginfo", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// update user's seller account
const updateSellerMailingInfo = async (req, res) => {
  const { mail, mailingAddress } = req.body;
  try {
    let user = await User.findById(req.user.id);
    user.sellerMailingInfo = {
      mail,
      mailingAddress,
    };
    user.markModified("sellerMailingInfo");
    user = await user.save();
    res.status(200).json({
      msg: "fetched Successfully",
      success: true,
    });
  } catch (e) {
    console.log("updating seller mailing info", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// fetch mail and mailing address of the buyer account
const getBuyerMailingInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      msg: "fetched Successfully",
      success: true,
      data: user.buyerMailingInfo,
    });
  } catch (e) {
    console.log("error in getting buyer mailing info", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// fetch mail and mailing address of the seller account
const getSellerMailingInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      msg: "Updated Successfully",
      success: true,
      data: user.sellerMailingInfo,
    });
  } catch (e) {
    console.log("error in getting seller mailing info", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// get the favorited license ids
const getFavoriteLicenseIds = async (req, res) => {
  const { accountAddress } = req.params;
  try {
    let userInfo = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    if (userInfo) {
      if (userInfo.favoritedLicenseIds?.length > 0) {
        const favorites = await ListedLicenses.find({
          listedId: { $in: userInfo.favoritedLicenseIds },
        });
        res.status(200).json({
          msg: "success",
          success: true,
          data: favorites,
        });
      } else {
        res.status(200).json({
          msg: "there is no favorited license",
          success: false,
        });
      }
    } else {
      res.status(200).json({ msg: "user not found", success: false });
    }
  } catch (e) {
    console.error("like the license Error", e);
    res.status(500).json({ msg: "like the license Error", success: false });
  }
};

const getTotalLikers = async (req, res) => {
  try {
    const { listedId } = req.body;
    const likers = await User.find({ favoritedLicenseIds: { $in: listedId } });
    res
      .status(200)
      .json({ msg: "Success", success: true, data: likers.length });
  } catch (e) {
    res.status(500).json({ msg: "like the license Error", success: false });
  }
};

module.exports = {
  adminSignIn,
  adminSignUp,
  getAllArtists,
  getContactInfoOfOffer,
  getAllBuyers,
  getAllCustomers,
  deleteBuyerById,
  deleteArtistById,
  deleteCustomerById,
  updateProfileByAdmin,
  updateCustomerProfileByAdmin,
  createProfileByAdmin,
  createCustomerProfileByAdmin,
  getUserProfileFromSpotify,
  // sign up
  signInByMagic,
  sendCodeToPersonalEmail,
  sendCodeToPlatformEmail,
  checkPersonalCode,
  sendVerificationCodeToSpotifyEmail,
  sendVCodeToSpotifyEmail,
  verifySellerAccount,
  sendEmailToCollaborators,
  //
  uploadImage,
  searchArtists,
  // public profile
  savePublicProfile,
  updatePublicProfile,
  deleteCollection,
  removeCollection,
  getPublicProfile,
  checkIfLiked,
  likeOrDislikeLicense,
  checkFollowing,
  updateFollow,
  getFollowingBuyers,
  updateBuyerPlatform,
  updateAddressHandler,
  updateSellerPlatform,
  getBuyerPlatform,
  getSellerPlatform,
  getCurrentAccount,
  deleteSellerAccount,
  setArtistAddressForSellerId,
  getPrivateProfileData,
  getFavoriteLicenseIds,
  updateUsername,
  getUserLegalName,
  getTotalLikers,
  getCollectionData,
  getSellerData,
  updateSellerProfile,
  updateSellerMailingInfo,
  updateBuyerMailingInfo,
  getBuyerMailingInfo,
  getSellerMailingInfo,
  getSocialAccounts,
  addProfileViewer,
};
