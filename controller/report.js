const cron = require("node-cron");
const Recommendation = require("../model/recommendation");
const User = require("../model/user");
const Report = require("../model/report");
const SoldLicenses = require("../model/soldLicenses");
const ListedLicenses = require("../model/listedLicenses");
const LicenseReport = require("../model/licenseReport");
const Tag = require("../model/tag");

const {
  RPC_URL,
  CONTRACT_FACTORY_ADDRESS,
  COMPANY_ACCOUNT_PRIVATE_KEY,
  CLIENT_ORIGIN,
  MAX_RECOMMENDATION_EXPIRATION_TIME,
} = require("../config");
const ethers = require("ethers");
const factoryAbi = require("../abi/NitrilityFactory.json");
const io = require("../io").io();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const {
  createLockedNotification,
  createLicenseBurntNotification,
  createRecommendedLicenseNotification,
} = require("./notification");

const socialMedias = {
  YOUTUBE: "YouTube",
  TWITTER: "Twitter",
  TWITCH: "Twitch",
  INSTAGRAM: "Instagram",
  LINKEDIN: "Linkedin",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  ROBLOX: "Roblox",
};

const burnedLicenseMsg = {
  success: "Reported successfully",
  pending: "Pending now",
  rejected: "Sorry. This report is rejected",
  approved: "This report is approved",
  noExisting: "could not find the sold license",
};

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(COMPANY_ACCOUNT_PRIVATE_KEY, provider);
const factoryContract = new ethers.Contract(
  CONTRACT_FACTORY_ADDRESS,
  factoryAbi,
  provider
);

const factoryWithSigner = factoryContract.connect(wallet);

// cron job
const cronJob = async () => {
  cron.schedule("0 8 * * *", async function () {
    //
    console.log("cron job start");
    const recommendations = await Recommendation.find({ status: 1 });
    await Promise.all(
      recommendations.map(async (recommendation) => {
        const currentTime = Date.now();
        if (currentTime > recommendation.createdAt + 7 * 24 * 60 * 60) {
          //10 for test
          let recommended = await Recommendation.findById(recommendation);
          recommended.status = 3;
          await recommended.save();
          updateTagTable(
            recommendation.contentId,
            recommendation.licenseName,
            recommendation.socialMediaName,
            safeMode.unsafe
          );
          // should be send the data
          io.emit("recommendation", {
            contentId: recommendation.contentId,
            userIds: recommendation.userIds,
            licenseName: recommendation.licenseName,
            sellerName: recommendation.sellerName,
            action: "Did not purchase a License",
          });
        }
      })
    );
  });
};

// const scenario2 = async (checkingTag, parameters) => {
//   const {
//     socialMediaName,
//     claimId,
//     contentId,
//     userId,
//     licenseName,
//     creatorName,
//     user,
//   } = parameters;
//   let result = null;
//   let transaction;
//   try {
//     if (checkingTag) {
//       transaction = await mediaWithSigner.createEmptyTag(
//         contentId,
//         socialMediaName
//       );
//       await transaction.wait();
//     }

//     let soldLicense = await SoldLicenses.findOne({
//       "ownerInfo.platformTitle": {
//         $regex: socialMediaName,
//         $options: "i",
//       },
//       "ownerInfo.accounts": {
//         $elemMatch: { email: { $regex: userId, $options: "i" } },
//       },
//       licenseName: { $regex: licenseName, $options: "i" },
//       isBurned: false,
//     });

//     let burnedNFT = null;

//     if (user) {
//       const results = await nftContract.fetchOwnedNFTs(user.accountAddress);

//       for (let i = 0; i < results.length; i++) {
//         const nft = Object.assign({}, results[i]);
//         const metadata = await axios({
//           url: nft.tokenURI,
//           method: "get",
//         });
//         const nftName =
//           metadata.data.metadata.properties.licenseName.description;
//         if (nftName.toLowerCase() === licenseName.toLowerCase()) {
//           burnedNFT = nft;
//           break;
//         }
//       }
//     }

//     if (soldLicense) {
//       let usecase;
//       switch (socialMediaName) {
//         case socialMedias.YOUTUBE.toLowerCase():
//           usecase = socialMedias.YOUTUBE;
//           break;
//         case socialMedias.TWITTER.toLowerCase():
//           usecase = socialMedias.TWITTER;
//           break;
//         case socialMedias.TWITCH.toLowerCase():
//           usecase = socialMedias.TWITCH;
//           break;
//         case socialMedias.INSTAGRAM.toLowerCase():
//           usecase = socialMedias.INSTAGRAM;
//           break;
//         case socialMedias.LINKEDIN.toLowerCase():
//           usecase = socialMedias.LINKEDIN;
//           break;
//         case socialMedias.TIKTOK.toLowerCase():
//           usecase = socialMedias.TIKTOK;
//           break;
//         case socialMedias.FACEBOOK.toLowerCase():
//           usecase = socialMedias.FACEBOOK;
//           break;
//         case socialMedias.ROBLOX.toLowerCase():
//           usecase = socialMedias.ROBLOX;
//           break;
//         default:
//           break;
//       }
//       try {
//         transaction = await nftWithSigner.burnSoldNFT(burnedNFT.tokenId);
//         await transaction.wait();
//         createLicenseBurntNotification(
//           user.accountAddress,
//           burnedNFT.tokenId,
//           `${burnedNFT.licenseName} License Burned for ${usecase} Video ${contentId}`
//         );
//       } catch (err) {
//         console.log("burn error - 1", err);
//       }
//       soldLicense.usecase = usecase;
//       soldLicense.isBurned = true;
//       soldLicense.contentId = contentId;
//       soldLicense.createdAt = new Date().getTime();
//       await soldLicense.save();

//       try {
//         await mediaWithSigner.addTag(
//           contentId,
//           socialMediaName,
//           licenseName,
//           true
//         );

//         const burnedLicense = {
//           ownerAddress: soldLicense.ownerAddress,
//           sellerAddress: soldLicense.sellerAddress,
//           licenseName: soldLicense.licenseName,
//           sellerName: soldLicense.sellerName,
//           price: soldLicense.price,
//         };
//         result = {
//           claimId,
//           contentId,
//           userId,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           decisionOfRuling: "no action needed",
//           burnedLicense,
//         };
//         await mediaWithSigner.createSocialMediaDatabase(
//           claimId,
//           contentId,
//           userId,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           "no action needed",
//           burnedLicense,
//           0
//         );
//       } catch (e) {
//         console.log("social media error ", e);
//       }
//     } else {
//       const listedLicense = await ListedLicenses.findOne({
//         licenseName,
//         isListed: true,
//       });
//       if (listedLicense) {
//         const alreadySaved = await Recommendation.findOne({
//           contentId,
//           licenseName,
//           sellerName: listedLicense?.sellerName,
//         });
//         let recommendedLink = null;
//         if (!alreadySaved) {
//           let recommendation = await Recommendation.create({
//             claimId,
//             creatorName,
//             socialMediaName,
//             contentId,
//             licenseName,
//             sellerName: listedLicense?.sellerName,
//             userIds: [userId],
//             recommendedLicense: listedLicense,
//             status: 1,
//           });
//           const token = await jwt.sign(
//             {
//               license: listedLicense,
//               platform: socialMediaName,
//               userIds: [userId],
//               contentId: contentId,
//               expiredTime:
//                 new Date().getTime() + MAX_RECOMMENDATION_EXPIRATION_TIME,
//             },
//             "shhhh",
//             {
//               algorithm: "HS256",
//             }
//           );
//           recommendedLink = `${CLIENT_ORIGIN}/recommended/${token}`;
//           recommendation.recommendedLink = recommendedLink;
//           await recommendation.save();
//         } else {
//           recommendedLink = alreadySaved.recommendedLink;
//         }

//         if (user) {
//           user.shutDownStatus.isShutDowned = true;
//           user.shutDownStatus.shutDownedTime = Date.now();
//           await user.save();
//           // io.emit("user-lock", {
//           //   id: user._id,
//           //   isLocked: true,
//           // });
//           createLockedNotification(
//             user.accountAddress,
//             `Your account is locked`
//           );
//         }

//         result = {
//           claimId,
//           contentId,
//           userId,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           decisionOfRuling: "unsafe, recommend license",
//           burnedLicense: {},
//           recommendedLink,
//         };
//       } else {
//         let transaction = await mediaWithSigner.addTag(
//           contentId,
//           socialMediaName,
//           licenseName,
//           false
//         );
//         await transaction.wait();

//         const burnedLicense = {
//           ownerAddress: "",
//           sellerAddress: "",
//           licenseName: "",
//           sellerName: "",
//           price: "",
//         };
//         result = {
//           claimId,
//           contentId,
//           userId,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           decisionOfRuling: "unsafe, no recommended license",
//           burnedLicense: {},
//         };
//         try {
//           await mediaWithSigner.createSocialMediaDatabase(
//             claimId,
//             contentId,
//             userId,
//             licenseName,
//             creatorName,
//             socialMediaName,
//             "unsafe, no recommended license",
//             burnedLicense,
//             0
//           );
//         } catch (err) {
//           console.log("error", err);
//         }
//       }
//     }
//     return result;
//   } catch (error) {
//     console.log("error = ", error);
//     return "something went wrong";
//   }
// };

// const reportClaim1 = async (req, res) => {
//   const {
//     socialMediaName,
//     claimId,
//     contentId,
//     userId,
//     licenseName,
//     creatorName,
//   } = req.body;
//   const _socialMediaName = socialMediaName.toLowerCase();
//   let user = await User.findOne({
//     "buyerAccountData.platformTitle": {
//       $regex: socialMediaName,
//       $options: "i",
//     },
//     "buyerAccountData.accounts": {
//       $elemMatch: { email: { $regex: userId, $options: "i" } },
//     },
//   });

//   const parameters = {
//     socialMediaName: _socialMediaName,
//     claimId,
//     contentId,
//     userId,
//     licenseName,
//     creatorName,
//     user,
//   };

//   const reportRes = await socialMediaContract.getReportItem(
//     contentId,
//     _socialMediaName
//   );

//   if (reportRes[0].active === 1) {
//     res.status(200).json({
//       claimId,
//       contentId,
//       userId,
//       licenseName,
//       creatorName,
//       socialMediaName,
//       decisionOfRuling: "unsafe for everything",
//     });
//   } else {
//     const checkingRes = await socialMediaContract.checkTagItem(
//       contentId,
//       _socialMediaName,
//       licenseName
//     );
//     const contentExisted = checkingRes[0];
//     const licenseExisted = checkingRes[1];
//     const isSafe = checkingRes[2];

//     if (contentExisted) {
//       if (!licenseExisted) {
//         const result = await scenario2(false, parameters);
//         res.status(200).json(result);
//       } else {
//         const reportItem = reportRes[0];
//         let tagItems = reportRes[1];
//         tagItems = tagItems.filter(
//           (tagItem) =>
//             tagItem.contentId !== "" &&
//             tagItem.licenseName !== "" &&
//             tagItem.socialMediaType !== ""
//         );
//         const result = Object.assign({}, reportItem);
//         if (isSafe) {
//           res.status(200).json({
//             claimId: result.claimId,
//             contentId: result.contentId,
//             userId: result.userId,
//             licenseName: result.licenseName,
//             creatorName: result.creatorName,
//             decisionOfRuling: result.decisionOfRuling,
//             burnedLicense: {},
//           });
//         } else {
//           res.status(200).json({
//             claimId: result.claimId,
//             contentId: result.contentId,
//             userId: result.userId,
//             licenseName: result.licenseName,
//             creatorName: result.creatorName,
//             decisionOfRuling: "no action needed",
//             burnedLicense: {},
//           });
//         }
//       }
//     } else {
//       const result = await scenario2(true, parameters);
//       res.status(200).json(result);
//     }
//   }
// };

const getLicenseReport = async (req, res) => {
  const { accountAddress } = req.params;
  try {
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    let buyerData = user.buyerAccountData;
    let licenseReports = [];
    await Promise.all(
      buyerData.map(async (item) => {
        await Promise.all(
          item.accounts.map(async (account) => {
            let report = await LicenseReport.findOne({
              userId: { $regex: account.email, $options: "i" },
              socialMediaName: { $regex: item.platformTitle, $options: "i" },
            });
            if (report) {
              licenseReports = [].concat(licenseReports, report);
            }
          })
        );
      })
    );
    res
      .status(200)
      .json({ msg: "success", success: true, data: licenseReports });
  } catch (err) {
    console.log(err);
    res.status(200).json({ msg: "faild", success: false });
  }
};

// Scenario 2 for 11
// const scenario2BySeveralUserIds = async (checkingTag, parameters) => {
//   const {
//     socialMediaName,
//     claimId,
//     contentId,
//     userIds,
//     licenseName,
//     creatorName,
//   } = parameters;
//   let result = null;
//   let transaction;
//   try {
//     if (checkingTag) {
//       await mediaWithSigner.createEmptyTag(contentId, socialMediaName);
//     }
//     let soldLicense = null;
//     let userId = null;
//     let user = null;
//     let burnedNFT = null;

//     userIds.every(async (id) => {
//       const solded = await SoldLicenses.findOne({
//         "ownerInfo.platformTitle": {
//           $regex: socialMediaName,
//           $options: "i",
//         },
//         "ownerInfo.accounts": {
//           $elemMatch: { email: { $regex: id, $options: "i" } },
//         },
//         licenseName: { $regex: licenseName, $options: "i" },
//         isBurned: false,
//       });
//       if (solded) {
//         soldLicense = solded;
//         userId = id;
//         return false;
//       }
//       return true;
//     });
//     if (userId) {
//       user = await User.findOne({
//         "buyerAccountData.platformTitle": {
//           $regex: socialMediaName,
//           $options: "i",
//         },
//         "buyerAccountData.accounts": {
//           $elemMatch: { email: { $regex: userId, $options: "i" } },
//         },
//       });

//       if (user) {
//         const results = await marketplaceContract.fetchMyNFTs(
//           user.accountAddress
//         );
//         for (let i = 0; i < results.length; i++) {
//           const nft = Object.assign({}, results[i]);
//           if (nft?.licenseName.toLowerCase() === licenseName.toLowerCase()) {
//             burnedNFT = nft;
//             break;
//           }
//         }
//       }
//     }

//     if (soldLicense) {
//       let usecase;
//       switch (socialMediaName) {
//         case socialMedias.YOUTUBE.toLowerCase():
//           usecase = socialMedias.YOUTUBE;
//           break;
//         case socialMedias.TWITTER.toLowerCase():
//           usecase = socialMedias.TWITTER;
//           break;
//         case socialMedias.TWITCH.toLowerCase():
//           usecase = socialMedias.TWITCH;
//           break;
//         case socialMedias.INSTAGRAM.toLowerCase():
//           usecase = socialMedias.INSTAGRAM;
//           break;
//         case socialMedias.LINKEDIN.toLowerCase():
//           usecase = socialMedias.LINKEDIN;
//           break;
//         case socialMedias.TIKTOK.toLowerCase():
//           usecase = socialMedias.TIKTOK;
//           break;
//         case socialMedias.FACEBOOK.toLowerCase():
//           usecase = socialMedias.FACEBOOK;
//           break;
//         case socialMedias.ROBLOX.toLowerCase():
//           usecase = socialMedias.ROBLOX;
//           break;
//         default:
//           break;
//       }
//       try {
//         transaction = await nftWithSigner.burnSoldNFT(burnedNFT.tokenId);
//         await transaction.wait();
//         createLicenseBurntNotification(
//           user.accountAddress,
//           burnedNFT.tokenId,
//           `${burnedNFT.licenseName} License Burned for ${usecase} Video ${contentId}`
//         );
//       } catch (err) {
//         console.log("burn error - 2", err);
//       }
//       soldLicense.usecase = usecase;
//       soldLicense.isBurned = true;
//       soldLicense.contentId = contentId;
//       soldLicense.createdAt = new Date().getTime();
//       await soldLicense.save();

//       await mediaWithSigner.addTag(
//         contentId,
//         socialMediaName,
//         licenseName,
//         true
//       );
//       const burnedLicense = {
//         ownerAddress: soldLicense.ownerAddress,
//         sellerAddress: soldLicense.sellerAddress,
//         licenseName: soldLicense.licenseName,
//         sellerName: soldLicense.sellerName,
//         price: soldLicense.price,
//       };

//       result = {
//         claimId,
//         contentId,
//         userIds,
//         licenseName,
//         creatorName,
//         socialMediaName,
//         decisionOfRuling: "no action needed",
//         burnedLicense,
//       };
//       userIds.map((id) => {
//         mediaWithSigner.createSocialMediaDatabase(
//           claimId,
//           contentId,
//           id,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           "no action needed",
//           burnedLicense,
//           0
//         );
//       });
//       // await mediaWithSigner.withdrawFee(
//       //   "0x614268749cCA9e5A9991Df1eee64592EFA1F4336",
//       //   burnedNFT.price
//       // );
//     } else {
//       const listedLicense = await ListedLicenses.findOne({
//         licenseName,
//         isListed: true,
//       });
//       if (listedLicense) {
//         const alreadySaved = await Recommendation.findOne({
//           contentId,
//           licenseName,
//           sellerName: listedLicense?.sellerName,
//         });
//         let recommendedLink = null;
//         if (!alreadySaved) {
//           let recommendation = await Recommendation.create({
//             claimId,
//             creatorName,
//             socialMediaName,
//             contentId,
//             licenseName: listedLicense.licenseName,
//             sellerName: listedLicense?.sellerName,
//             userIds,
//             recommendedLicense: listedLicense,
//             status: 1,
//           });

//           const token = await jwt.sign(
//             {
//               license: listedLicense,
//               platform: socialMediaName,
//               userIds,
//               id: recommendation._id,
//             },
//             "shhhh",
//             {
//               algorithm: "HS256",
//             }
//           );
//           recommendedLink = `${CLIENT_ORIGIN}/recommended/${token}`;
//           recommendation.recommendedLink = recommendedLink;
//           await recommendation.save();
//         } else {
//           recommendedLink = alreadySaved.recommendedLink;
//         }

//         result = {
//           claimId,
//           contentId,
//           userIds,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           decisionOfRuling: "unsafe, recommend license",
//           burnedLicense: {},
//           recommendedLink,
//         };
//       } else {
//         await mediaWithSigner.addTag(
//           contentId,
//           socialMediaName,
//           licenseName,
//           false
//         );
//         const burnedLicense = {
//           ownerAddress: "",
//           sellerAddress: "",
//           licenseName: "",
//           sellerName: "",
//           price: "",
//         };
//         result = {
//           claimId,
//           contentId,
//           userIds,
//           licenseName,
//           creatorName,
//           socialMediaName,
//           decisionOfRuling: "unsafe, no recommended license",
//           burnedLicense: {},
//         };
//         try {
//           userIds.map((id) => {
//             mediaWithSigner.createSocialMediaDatabase(
//               claimId,
//               contentId,
//               id,
//               licenseName,
//               creatorName,
//               socialMediaName,
//               "unsafe, no recommended license",
//               burnedLicense,
//               0
//             );
//           });
//         } catch (err) {
//           console.log("error", err);
//         }
//       }
//     }
//     return result;
//   } catch (error) {
//     console.log(error);
//     return null;
//   }
// };

// Scenario 11
const reportClaimBySeveralUserIds = async (req, res) => {
  const {
    socialMediaName,
    claimId,
    contentId,
    userIds,
    licenseName,
    creatorNames,
  } = req.body;
  const parameters = {
    socialMediaName: _socialMediaName,
    claimId,
    contentId,
    userIds,
    licenseName,
    creatorNames,
  };

  const reportRes = await socialMediaContract.getReportItem(
    contentId,
    _socialMediaName
  );
  if (reportRes[0].active === 1) {
    res.status(200).json({
      claimId,
      contentId,
      userIds,
      licenseName,
      creatorName,
      socialMediaName,
      decisionOfRuling: "unsafe for everything",
    });
  } else {
    const checkingRes = await socialMediaContract.checkTagItem(
      contentId,
      _socialMediaName,
      licenseName
    );
    const contentExisted = checkingRes[0];
    const licenseExisted = checkingRes[1];
    const isSafe = checkingRes[2];

    if (contentExisted) {
      if (!licenseExisted) {
        const result = await scenario2BySeveralUserIds(false, parameters);
        res.status(200).json(result);
      } else {
        const reportRes = await socialMediaContract.getReportItem(
          contentId,
          _socialMediaName
        );
        const reportItem = reportRes[0];
        let tagItems = reportRes[1];
        tagItems = tagItems.filter(
          (tagItem) =>
            tagItem.contentId !== "" &&
            tagItem.licenseName !== "" &&
            tagItem.socialMediaType !== ""
        );
        const result = Object.assign({}, reportItem);
        if (isSafe) {
          res.status(200).json({
            claimId: result.claimId,
            contentId: result.contentId,
            userIds,
            licenseName: result.licenseName,
            creatorName: result.creatorName,
            decisionOfRuling: result.decisionOfRuling,
            burnedLicense: {},
          });
        } else {
          res.status(200).json({
            claimId: result.claimId,
            contentId: result.contentId,
            userIds,
            licenseName: result.licenseName,
            creatorName: result.creatorName,
            decisionOfRuling: "no action needed",
            burnedLicense: {},
          });
        }
      }
    } else {
      const result = await scenario2BySeveralUserIds(true, parameters);
      res.status(200).json(result);
    }
  }
};

// check the tags table (database E)
const safeMode = {
  error: -1,
  none: 0,
  safe: 1,
  unsafe: 2,
  unsafeForEverything: 3,
};

const updateTagTable = async (
  contentId,
  licenseName,
  socialMediaName,
  tagVal
) => {
  let result = safeMode.none;
  try {
    await Tag.findOneAndDelete(
      {
        licenseName: { $regex: licenseName, $options: "i" },
        contentId: { $regex: contentId, $options: "i" },
        socialMediaName: { $regex: socialMediaName, $options: "i" },
      },
      {
        safeType: tagVal,
      }
    );
  } catch (e) {
    console.log("error in checking tag table", e);
    result = safeMode.none;
  }
  return result;
};

const checkListedTable = async (licenseName) => {
  const listedLicense = await ListedLicenses.findOne({
    licenseName,
    isListed: true,
  });
  return listedLicense;
};

const checkSoldTable = async (licenseName, userId, socialMediaName) => {
  const soldLicense = await SoldLicenses.findOne({
    "ownerInfo.platformTitle": {
      $regex: socialMediaName,
      $options: "i",
    },
    "ownerInfo.accounts": {
      $elemMatch: { email: { $regex: userId, $options: "i" } },
    },
    licenseName: { $regex: licenseName, $options: "i" },
    isBurned: false,
  });
  return soldLicense;
};
const recommendLicense = async (
  claimId,
  creatorNames,
  socialMediaName,
  contentId,
  userId,
  listedLicense
) => {
  let recommendedLicense = await Recommendation.findOne({
    contentId,
    licenseName: listedLicense.licenseName,
    sellerName: listedLicense.sellerName,
  });
  const token = await jwt.sign(
    {
      license: listedLicense,
      platform: socialMediaName,
      userIds: [userId],
      contentId: contentId,
      expiredTime: new Date().getTime() + MAX_RECOMMENDATION_EXPIRATION_TIME,
    },
    "shhhh",
    {
      algorithm: "HS256",
    }
  );
  let recommendedLink = `${CLIENT_ORIGIN}/recommended/${token}`;

  if (!recommendedLicense) {
    recommendedLicense = await Recommendation.create({
      claimId,
      creatorNames,
      socialMediaName,
      contentId,
      licenseName: listedLicense.licenseName,
      sellerName: listedLicense.sellerName,
      userIds: [userId],
      recommendedLicenseId: listedLicense._id,
      status: 1, // 1 - pending, 2 - purchased, 3 - didnt purchased
      recommendedLink,
    });
    createRecommendedLicenseNotification(
      recommendedLicense._id,
      userId,
      socialMediaName,
      `License ${listedLicense.licenseName} Recommended for ${socialMediaName} Video ${contentId}`
    );
  } else {
    recommendedLink = recommendedLicense.recommendedLink;
    recommendedLicense = await recommendedLicense.save();
  }

  const result = {
    claimId,
    contentId,
    userId,
    licenseName: listedLicense.licenseName,
    creatorNames,
    socialMediaName,
    decisionOfRuling: "unsafe, recommend license",
    burnedLicense: {},
    recommendedLink,
  };

  return result;
};

// scenario 2
const reportClaim = async (req, res) => {
  const {
    socialMediaName,
    claimId,
    contentId,
    userId,
    licenseName,
    creatorNames,
  } = req.body;
  let checkingTags = safeMode.none;
  let tag;
  try {
    tag = await Tag.findOne({
      licenseName: { $regex: licenseName, $options: "i" },
      contentId: { $regex: contentId, $options: "i" },
      socialMediaName: { $regex: socialMediaName, $options: "i" },
    });
    if (tag) {
      if (tag?.safeType) {
        checkingTags = tag.safeType;
      } else {
        checkingTags = safeMode.none;
      }
    } else {
      tag = await Tag.create({
        contentId,
        licenseName,
        socialMediaName,
        safeType: safeMode.none,
      });
      checkingTags = safeMode.none;
    }
  } catch (e) {
    console.log("error in checking tag table", e);
    checkingTags = safeMode.error;
  }
  switch (checkingTags) {
    case safeMode.none:
      // scenario 4
      const soldLicense = await checkSoldTable(
        licenseName,
        userId,
        socialMediaName
      );

      if (soldLicense) {
        try {
          const transaction = await nftWithSigner.burnSoldNFT(
            soldLicense.tokenId
          );
          await transaction.wait();
          soldLicense.usecase = socialMediaName;
          soldLicense.isBurned = true;
          soldLicense.contentId = contentId;
          await soldLicense.save();
          tag.safeType = safeMode.safe;
          await tag.save();
          const burnedLicense = {
            ownerAddress: soldLicense.buyerAddress,
            sellerAddress: soldLicense.sellerAddress,
            licenseName: soldLicense.licenseName,
            sellerName: soldLicense.sellerName,
            price: soldLicense.price,
          };
          const listD = {
            claimId,
            contentId,
            userId,
            licenseName,
            creatorNames,
            socialMediaName,
            decisionOfRuling: "no action needed",
            burnedLicense,
          };
          const stored = await LicenseReport.create({
            ...listD,
            burnedLicenseId: soldLicense._id,
          });
          await createLicenseBurntNotification(
            stored._id,
            userId,
            socialMediaName,
            `${licenseName} Burned for ${socialMediaName} Video ${contentId}`
          );
          res.status(200).json({ msg: "success", success: true, data: listD });
        } catch (e) {
          console.log("error in burning license", e);
          res.status(500).json({ msg: "faild", success: false });
        }
      } else {
        try {
          listedLicense = await checkListedTable(licenseName);
          if (listedLicense) {
            // scenario 4 - recommend license
            try {
              const result = await recommendLicense(
                claimId,
                creatorNames,
                socialMediaName,
                contentId,
                userId,
                listedLicense
              );
              res
                .status(200)
                .json({ msg: "success", success: true, data: result });
            } catch (e) {
              console.log("error in recommending license", e);
              res.status(500);
            }
          } else {
            // scenario 3
            tag.safeType = safeMode.unsafe;
            await tag.save();
            const listD = {
              claimId,
              contentId,
              userId,
              licenseName,
              creatorNames,
              socialMediaName,
              decisionOfRuling: "unsafe, no recommended license",
            };
            await LicenseReport.create({ ...listD });
            res
              .status(200)
              .json({ msg: "success", success: true, data: listD });
          }
        } catch (e) {
          console.log("error in checking listed licenses", e);
          res.status(500);
        }
      }

      break;
    case safeMode.safe:
      // scenario 1
      const safeListD = {
        claimId,
        contentId,
        userId,
        licenseName,
        creatorNames,
        socialMediaName,
        decisionOfRuling: "no action needed",
      };
      res.status(200).json({ msg: "success", success: true, data: safeListD });
      break;
    case safeMode.unsafe:
      // scenario 5
      const unsafeListD = {
        claimId,
        contentId,
        userId,
        licenseName,
        creatorNames,
        socialMediaName,
        decisionOfRuling: "no action needed",
      };
      res
        .status(200)
        .json({ msg: "success", success: true, data: unsafeListD });
      break;
    case safeMode.unsafeForEverything:
      const inappropriateListD = {
        claimId,
        contentId,
        userId,
        licenseName,
        creatorNames,
        socialMediaName,
        decisionOfRuling: "unsafe for everything",
      };
      res
        .status(200)
        .json({ msg: "success", success: true, data: inappropriateListD });
      break;
    case safeMode.error:
    default:
      res.status(500).json({ msg: "Something went wrong", success: false });
      break;
  }
};

const appealMode = {
  default: 0,
  inappropriate: 1,
  appeal: 2,
};

const reportInappropriate = async (req, res) => {
  const { contentId, userId, socialMediaName } = req.body;
  try {
    let tag = await Tag.findOne({
      contentId: { $regex: contentId, $options: "i" },
      socialMediaName: { $regex: socialMediaName, $options: "i" },
    });
    if (tag) {
      tag.safeType = safeMode.unsafeForEverything;
      await tag.save();
    } else {
      res
        .status(200)
        .json({ msg: "There is no claim for this content", success: false });
      return;
    }

    let report = await LicenseReport.findOne({
      userId: { $regex: userId, $options: "i" },
      contentId: { $regex: contentId, $options: "i" },
      socialMediaName: { $regex: socialMediaName, $options: "i" },
    });

    if (report) {
      report.decisionOfRuling = "unsafe for everything";
      report.active = appealMode.inappropriate;
      const stored = await report.save();

      const data = {
        claimId: stored.claimId,
        contentId: contentId,
        userId: userId,
        licenseName: stored.licenseName,
        creatorNames: stored.creatorNames,
        decisionOfRuling: "unsafe for everything",
        burnedLicense: {},
      };
      res.status(200).json({ msg: "success", success: true, data });
    } else {
      res
        .status(200)
        .json({ msg: "There is no claim for this content", success: false });
    }
  } catch (err) {
    console.log("error in report inappropriate", err);
    res.status(500).json("something went wrong");
  }
};

// scenario 8
// by user
const reportAppealByUser = async (req, res) => {
  const { contentId, userId } = req.body;
  try {
    let report = await LicenseReport.findOne({
      contentId: { $regex: contentId, $options: "i" },
      userId: { $regex: userId, $options: "i" },
    });
    if (report) {
      report.decisionOfRuling =
        "Video is marked as inappropriate but needs further review";
      const stored = await report.save();
      const data = {
        contentId,
        userId,
        licenseName: stored.licenseName,
        socialMediaName: stored.socialMediaName,
        decisionOfRuling: stored.decisionOfRuling,
      };
      io.emit("report-appeal-claim", data);

      res.status(200).json({
        msg: "success",
        success: true,
        data,
      });
    } else {
      res
        .status(200)
        .json({ msg: "There is no claims for this content", success: false });
    }
  } catch (e) {
    console.log("error in appeal by user", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// by social platform
const reportAppealBySocialMedia = async (req, res) => {
  const { contentId, userId, socialMediaName } = req.body;
  try {
    let report = await LicenseReport.findOne({
      contentId: { $regex: contentId, $options: "i" },
      userId: { $regex: userId, $options: "i" },
      socialMediaName: { $regex: socialMediaName, $options: "i" },
    });
    if (report) {
      report.active = appealMode.appeal;
      report.decisionOfRuling = "Video is no longer marked as inappropriate";
      const stored = await report.save();
      const data = {
        contentId,
        userId,
        licenseName: stored.licenseName,
        socialMediaName: stored.socialMediaName,
        decisionOfRuling: stored.decisionOfRuling,
      };
      res.status(200).json({ msg: "success", success: true, data });
    } else {
      res.status(200).json({ msg: "There is no claims for this content" });
    }
  } catch (e) {
    console.log("error in appeal by social media", e);
    res.status(500).json({ msg: "Something went wrong" });
  }
};

// scenario 9
// by user
const reportBurnedLicenseByUser = async (req, res) => {
  const { licenseReportId } = req.body;
  try {
    let report = await LicenseReport.findById(licenseReportId);
    if (report) {
      let soldLicense = await SoldLicenses.findById(report.burnedLicenseId);
      if (!soldLicense) {
        res
          .status(200)
          .json({ msg: burnedLicenseMsg.noExisting, success: false });
        return;
      } else {
        let msg = "";
        switch (soldLicense.status) {
          case 0:
            msg = burnedLicenseMsg.pending;
            break;
          case 1:
            msg = burnedLicenseMsg.approved;
            break;
          case 2:
            msg = burnedLicenseMsg.rejected;
            break;
          default:
            msg = burnedLicenseMsg.success;
            break;
        }

        report.decisionOfRuling = `Video was marked as using ${soldLicense.licenseName} and ${soldLicense.sellerName} but needs further review`;
        const stored = await report.save();

        const data = {
          claimId: stored.claimId,
          contentId: stored.contentId,
          userId: stored.userId,
          licenseName: stored.licenseName,
          sellerName: stored.sellerName,
          creatorNames: stored.creatorNames,
          decisionOfRuling: `Video was marked as using ${report.licenseName} and ${report.sellerName} but needs further review`,
        };
        io.emit("report-burned-license", data);
        soldLicense.status = 0;
        await soldLicense.save();
        res.status(200).json({ msg, success: true, data });
      }
    } else {
      res
        .status(200)
        .json({ msg: "There is no claims for this content", success: false });
    }
  } catch (e) {
    console.log("error in reporting burned license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// by social media
const reportBurnedLicenseBySocialMedia = async (req, res) => {
  const {
    socialMediaName,
    claimId,
    contentId,
    userId,
    licenseName,
    sellerName,
  } = req.body;
  try {
    let report = await LicenseReport.findOne({
      claimId: { $regex: claimId, $options: "i" },
      userId: { $regex: userId, $options: "i" },
      contentId: { $regex: contentId, $options: "i" },
      licenseName: { $regex: licenseName, $options: "i" },
      socialMediaName: { $regex: socialMediaName, $options: "i" },
    });

    if (report) {
      let soldLicense = await SoldLicenses.findById(report.burnedLicenseId);
      if (soldLicense) {
        const amountIn = ethers.utils.parseUnits(
          soldLicense.price.toString(),
          "ether"
        );

        await nftWithSigner.reCreateBurnedToken(
          soldLicense.buyerAddress,
          soldLicense.listedId,
          amountIn,
          soldLicense.tokenURI
        );
        report.decisionOfRuling =
          "Video is safe and burnt licenses are refunded";
        const stored = await report.save();
        const data = {
          contentId,
          userId,
          licenseName: stored.licenseName,
          socialMediaName: stored.socialMediaName,
          decisionOfRuling: stored.decisionOfRuling,
        };
        res.status(200).json({ msg: "success", success: true, data });
      } else {
        // scenario 10
        await Tag.findOneAndDelete(
          {
            licenseName: { $regex: licenseName, $options: "i" },
            contentId: { $regex: contentId, $options: "i" },
            socialMediaName: { $regex: socialMediaName, $options: "i" },
          },
          {
            safeType: safeMode.safe,
          }
        );
        report.decisionOfRuling =
          "Video is safe and burnt licenses are refunded";
        const stored = await report.save();
        const data = {
          claimId: stored.claimId,
          contentId: contentId,
          userId: userId,
          licenseName: stored.licenseName,
          creatorNames: stored.creatorNames,
          decisionOfRuling: stored.decisionOfRuling,
        };
        res.status(200).json({ msg: "success", success: true, data });
      }
    } else {
      res
        .status(200)
        .json({ msg: "There is no claims for this content", success: false });
    }
  } catch (e) {
    console.log("error in re create token", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

/** account report */
const reportProfile = async (req, res) => {
  const { from, to, type, contents } = req.body;
  new Report({
    from,
    to,
    type,
    contents,
  })
    .save()
    .then((data) => {
      res.status(200).json({
        msg: "Reported successfully.",
        success: true,
        data: data,
      });
    })
    .catch((e) => {
      res.status(500).json({
        msg: "Your report was failed",
        success: false,
        data: e,
      });
    });
};

module.exports = {
  cronJob,
  reportClaim,
  reportInappropriate,
  reportAppealBySocialMedia,
  reportAppealByUser,
  reportBurnedLicenseByUser,
  reportBurnedLicenseBySocialMedia,
  reportClaimBySeveralUserIds,
  getLicenseReport,
  reportProfile,
};
