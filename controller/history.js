const { default: axios } = require("axios");
const {
  HistoryFilters,
  EventTypes,
  LicensingTypes,
  UserRoles,
  PlatformTypes,
  OfferTypes,
  Activities,
  SortOptions,
} = require("../interface");
const History = require("../model/history");
const SoldLicenses = require("../model/soldLicenses");
const Offers = require("../model/offers");
const { IPFS_METADATA_API_URL } = require("../config");
const ListedLicenses = require("../model/listedLicenses");
const LicenseChanges = require("../model/licenseChanges");
const OfferChanges = require("../model/offerChanges");
const User = require("../model/user");
const SellerData = require("../model/sellerData");
const Idenfy = require("../model/idenfy");

const createHistory = async (
  eventType,
  listedId,
  licensingTypes,
  tokenId,
  price,
  accessLevel,
  expirationTime,
  from,
  to,
  offerType = OfferTypes.NoneOffer,
  counts = 1,
  transactionHash = ""
) => {
  try {
    let history = null;
    if (eventType <= EventTypes.OfferExpired) {
      history = await History.findOne({
        transactionHash: { $regex: transactionHash, $options: "i" },
      });
    }

    if (!history) {
      history = await History.create({
        eventType,
        listedId,
        tokenId,
        price,
        licensingTypes,
        accessLevel,
        expirationTime,
        from,
        to,
        offerType,
        transactionHash,
        counts,
      });
      if (eventType === EventTypes.Edited || eventType === EventTypes.Listed) {
        const listedLicense = await ListedLicenses.findOne({ listedId });
        await LicenseChanges.create({
          listedId,
          signingData: listedLicense.signingData,
          historyId: history.historyId,
        });
      } else {
        if (eventType === EventTypes.OfferEdited) {
          const offer = await Offers.findOne({ offerId: tokenId });
          await OfferChanges.create({
            offerId: offer.offerId,
            offerPrice: offer.offerPrice,
            offerDuration: offer.offerDuration,
            tokenURI: offer.tokenURI,
            historyId: history.historyId,
          });
        }
      }
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log("error in creating history event", err);
    return false;
  }
};

const getHistoryByListedId = async (req, res) => {
  try {
    const { listedId, filters } = req.body;
    const { activities, sortOption } = filters;
    let query = { listedId: Number(listedId) };

    if (
      !activities[Activities.Sales] &&
      !activities[Activities.Listings] &&
      !activities[Activities.Offers] &&
      !activities[Activities.Collaborations]
    ) {
      return res.status(200).json({ msg: "Success", success: true, data: [] });
    } else {
      let existingConditions = query.$or ? query.$or : [];
      if (activities[Activities.Listings]) {
        query = {
          ...query,
          $or: [...existingConditions, { eventType: EventTypes.Listed }],
        };
      }

      existingConditions = query.$or ? query.$or : [];
      if (activities[Activities.Sales]) {
        query = {
          ...query,
          $or: [
            ...existingConditions,
            { eventType: EventTypes.CollaboratorAccepted },
            { eventType: EventTypes.CollaboratorRejectedr },
          ],
        };
      }

      existingConditions = query.$or ? query.$or : [];
      if (activities[Activities.Sales]) {
        query = {
          ...query,
          $or: [...existingConditions, { eventType: EventTypes.Purchased }],
        };
      }

      existingConditions = query.$or ? query.$or : [];
      if (activities[Activities.Offers]) {
        query = {
          ...query,
          $or: [
            ...existingConditions,
            { eventType: EventTypes.OfferPlaced },
            { eventType: EventTypes.OfferAccepted },
            { eventType: EventTypes.OfferRejected },
            { eventType: EventTypes.OfferWithdrawn },
            { eventType: EventTypes.OfferEdited },
            { eventType: EventTypes.OfferExpired },
          ],
        };
      }
    }

    const histories = await History.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "listedlicenses",
          localField: "listedId",
          foreignField: "listedId",
          as: "listedLicense",
        },
      },
      {
        $lookup: {
          from: "offers",
          localField: "tokenId",
          foreignField: "offerId",
          as: "offer",
        },
      },
      {
        $unwind: {
          path: "$listedLicense",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$offer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          eventType: 1,
          listedId: 1,
          tokenId: 1,
          price: 1,
          licensingTypes: 1,
          accessLevel: 1,
          expirationTime: 1,
          from: 1,
          to: 1,
          offerType: 1,
          createdAt: 1,
          historyId: 1,
          "offer.offerType": 1,
          "offer.offerId": 1,
          "offer.listedId": 1,
          "offer.sellerId": 1,
          "offer.buyerAddr": 1,
          "offer.offerPrice": 1,
          "offer.offerDuration": 1,
          "offer.tokenURI": 1,
          "offer.eventType": 1,
          "offer.licensingType": 1,
          "offer.accessLevel": 1,
          "offer.signingData": 1,
          "offer.buyerStatus": 1,
          "offer.sellerStatus": 1,
          "offer.counts": 1,
          "listedLicense.tokenURI": 1,
          "listedLicense.albumName": 1,
          "listedLicense.albumId": 1,
          "listedLicense.sellerName": 1,
          "listedLicense.sellerId": 1,
          "listedLicense.avatarPath": 1,
          "listedLicense.licenseName": 1,
          "listedLicense.imagePath": 1,
          "listedLicense.previewUrl": 1,
          "listedLicense.trackId": 1,
          "listedLicense.genres": 1,
          "listedLicense.artists": 1,
          "listedLicense.sellerAddress": 1,
          "listedLicense.length": 1,
          "listedLicense.tempo": 1,
          "listedLicense.signingData": 1,
        },
      },
      {
        $sort: { createdAt: SortOptions.Newest == sortOption ? 1 : -1 },
      },
    ]);

    const updatedHistories = await Promise.all(
      histories.map(async (history) => {
        const from = await Promise.all(
          history.from.map(async (id) => {
            const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(id);
            let curUser;
            let isBuyer;
            if (isEthereumAddress) {
              isBuyer = true;
              curUser = await User.findOne({
                accountAddress: { $regex: id, $options: "i" },
              });
            } else {
              isBuyer = false;
              curUser = await SellerData.findOne({
                sellerId: { $regex: id, $options: "i" },
              });
            }
            return {
              isBuyer,
              id,
              userName: isBuyer
                ? curUser?.firstName + "" + curUser?.lastName
                : curUser.sellerName,
            };
          })
        );

        const to = await Promise.all(
          history.to.map(async (id) => {
            const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(id);
            let curUser;
            let isBuyer;
            if (isEthereumAddress) {
              isBuyer = true;
              curUser = await User.findOne({
                accountAddress: { $regex: id, $options: "i" },
              });
            } else {
              isBuyer = false;
              curUser = await SellerData.findOne({
                sellerId: { $regex: id, $options: "i" },
              });
            }
            return {
              isBuyer,
              id,
              userName: isBuyer
                ? curUser?.firstName + "" + curUser?.lastName
                : curUser.sellerName,
            };
          })
        );

        return {
          ...history,
          from,
          to,
        };
      })
    );
    res
      .status(200)
      .json({ msg: "Success", success: true, data: updatedHistories });
  } catch (e) {
    console.log("error in getting history", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getSaleDetails = async (req, res) => {
  try {
    const { listedId } = req.body;
    if (licensingType > LicensingTypes.CreatorMasters) {
      const syncData = await Offers.findOne({
        listedId,
      }).lean();
      const metaDataRes = await axios.get(
        `${IPFS_METADATA_API_URL}/${syncData.tokenURI}`
      );
      const metadata = metaDataRes.data.metadata.properties;
      res.status(200).json({
        msg: "Success",
        success: true,
        data: {
          ...syncData,
          licenseName: metadata.licenseName.description,
          imagePath: metadata.imagePath.description,
          sellerName: metadata.sellerName.description,
          avatarPath: metadata.avatarPath.description,
          previewUrl: metadata.previewUrl.description,
          sellerId: metadata.sellerId.description,
          contentTitle: metadata.contentTitle.description,
          contentDescription: metadata.contentDescription.description,
          intendedPlatforms: metadata.intendedPlatforms.description,
          licenseUsage: metadata.licenseUsage.description,
        },
      });
    } else {
      const soldlicese = await SoldLicenses.findOne({ tokenId });
      res.status(200).json({ msg: "Success", success: true, data: soldlicese });
    }
  } catch (e) {
    console.log("getting sold creator sync details", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getOfferDetails = async (req, res) => {
  try {
    const { offerId, licensingType } = req.params;
    const offerData = await Offers.findOne({ offerId }).lean();
    const listedLicense = await ListedLicenses.findOne({
      listedId: offerData.listedId,
    }).lean();
    const commonData = {
      licenseName: listedLicense.licenseName,
      imagePath: listedLicense.imagePath,
      sellerName: listedLicense.sellerName,
      avatarPath: listedLicense.avatarPath,
      previewUrl: listedLicense.previewUrl,
      sellerId: listedLicense.sellerId,
    };
    let result;

    switch (Number(licensingType)) {
      case LicensingTypes.CreatorSync:
      case LicensingTypes.CreatorMasters:
        result = {
          ...offerData,
          ...commonData,
        };
        break;
      case LicensingTypes.MovieSync:
      case LicensingTypes.MovieMasters:
      case LicensingTypes.AdvertismentSync:
      case LicensingTypes.AdvertismentMasters:
      case LicensingTypes.VideoGameSync:
      case LicensingTypes.VideoGameMasters:
      case LicensingTypes.TvShowSync:
      case LicensingTypes.TvShowMasters:
        const metaDataRes = await axios.get(
          `${IPFS_METADATA_API_URL}/${offerData.tokenURI}`
        );
        const metadata = metaDataRes.data.metadata.properties;
        result = {
          ...offerData,
          ...commonData,
          contentTitle: metadata.contentTitle.description,
          contentDescription: metadata.contentDescription.description,
          intendedPlatforms: metadata.intendedPlatforms.description,
          licenseUsage: metadata.licenseUsage.description,
        };
        break;
      default:
        res.status(500).json({ msg: "Bad Query", success: false });
        return;
    }
    res.status(200).json({
      msg: "Success",
      success: true,
      data: result,
    });
  } catch (e) {
    console.log("error in gettin offer details", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getAllActivities = async (req, res) => {
  try {
    const { buyerAddr, sellerId, filters, isSeller } = req.body;
    const buyerSideCondition = {
      eventType: {
        $nin: [
          EventTypes.Listed,
          EventTypes.PendingListed,
          EventTypes.Edited,
          EventTypes.SongUnlisted,
          EventTypes.LicenseTypeUnlisted,
          EventTypes.CollaboratorAccepted,
          EventTypes.CollaboratorRejected,
        ],
      },
    };
    const necessaryCondition = {
      $or: [
        {
          from: {
            $elemMatch: {
              $regex: buyerAddr,
              $options: "i",
            },
          },
        },
        {
          from: {
            $elemMatch: {
              $regex: sellerId,
              $options: "i",
            },
          },
        },
        {
          to: {
            $elemMatch: {
              $regex: buyerAddr,
              $options: "i",
            },
          },
        },
        {
          to: {
            $elemMatch: {
              $regex: sellerId,
              $options: "i",
            },
          },
        },
      ],
      ...(isSeller ? {} : buyerSideCondition),
    };
    let activityCondition;
    const user = await User.findOne({
      accountAddress: { $regex: buyerAddr, $options: "i" },
    });
    const ownedLicenses = await SoldLicenses.find({
      buyerAddr: { $regex: buyerAddr, $options: "i" },
      sellerId: { $regex: sellerId, $options: "i" },
    });
    if (
      filters.activities.Sales &&
      filters.activities.Offers &&
      filters.activities.Listings &&
      filters.activities.Collaborations
    ) {
      activityCondition = {};
    } else {
      if (
        filters.activities.Sales ||
        filters.activities.Offers ||
        filters.activities.Listings ||
        filters.activities.Collaborations
      ) {
        activityCondition = { $or: [] };

        if (filters.activities.Sales) {
          activityCondition.$or = [
            ...activityCondition.$or,
            {
              eventType: EventTypes.Purchased,
            },
          ];
        }

        if (filters.activities.Offers) {
          activityCondition.$or = [
            ...activityCondition.$or,
            {
              $or: [
                { eventType: EventTypes.OfferEdited },
                { eventType: EventTypes.OfferExpired },
                { eventType: EventTypes.OfferPlaced },
                { eventType: EventTypes.OfferRejected },
              ],
            },
          ];
        }

        if (filters.activities.Listings) {
          activityCondition.$or = [
            ...activityCondition.$or,
            {
              eventType: EventTypes.Listed,
            },
          ];
        }

        if (filters.activities.Listings) {
          activityCondition.$or = [
            ...activityCondition.$or,
            {
              $or: [
                { eventType: EventTypes.CollaboratorAccepted },
                { eventType: EventTypes.CollaboratorRejected },
              ],
            },
          ];
        }
      } else {
        return res.status(200).json({
          msg: "success",
          success: true,
          data: {
            activities: [],
            owned: ownedLicenses.length,
            joinedDate: user.timeOfCreation,
            userName: user?.firstName + "" + user?.lastName ?? "",
          },
        });
      }
    }

    let histories = await History.aggregate([
      {
        $match: {
          ...necessaryCondition,
          ...activityCondition,
        },
      },
      {
        $lookup: {
          from: "listedlicenses",
          localField: "listedId",
          foreignField: "listedId",
          as: "listedLicense",
        },
      },
      {
        $lookup: {
          from: "offers",
          localField: "tokenId",
          foreignField: "offerId",
          as: "offer",
        },
      },
      {
        $unwind: {
          path: "$listedLicense",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$offer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          eventType: 1,
          listedId: 1,
          tokenId: 1,
          price: 1,
          licensingTypes: 1,
          accessLevel: 1,
          expirationTime: 1,
          from: 1,
          to: 1,
          offerType: 1,
          counts: 1,
          createdAt: 1,
          historyId: 1,
          "offer.offerType": 1,
          "offer.offerId": 1,
          "offer.listedId": 1,
          "offer.sellerId": 1,
          "offer.buyerAddr": 1,
          "offer.offerPrice": 1,
          "offer.offerDuration": 1,
          "offer.tokenURI": 1,
          "offer.eventType": 1,
          "offer.licensingType": 1,
          "offer.accessLevel": 1,
          "offer.signingData": 1,
          "offer.buyerStatus": 1,
          "offer.sellerStatus": 1,
          "offer.counts": 1,
          "listedLicense.tokenURI": 1,
          "listedLicense.albumName": 1,
          "listedLicense.albumId": 1,
          "listedLicense.sellerName": 1,
          "listedLicense.sellerId": 1,
          "listedLicense.avatarPath": 1,
          "listedLicense.licenseName": 1,
          "listedLicense.imagePath": 1,
          "listedLicense.previewUrl": 1,
          "listedLicense.trackId": 1,
          "listedLicense.genres": 1,
          "listedLicense.artists": 1,
          "listedLicense.sellerAddress": 1,
          "listedLicense.length": 1,
          "listedLicense.tempo": 1,
          "listedLicense.signingData": 1,
        },
      },
      {
        $match: {
          "listedLicense.licenseName": {
            $regex: new RegExp(filters.keyword, "i"),
          },
        },
      },
      {
        $sort: { createdAt: SortOptions.Newest == filters.sortOption ? 1 : -1 },
      },
    ]);

    const updatedHistories = await Promise.all(
      histories.map(async (history) => {
        const from = await Promise.all(
          history.from.map(async (id) => {
            const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(id);
            let curUser;
            let isBuyer;
            if (isEthereumAddress) {
              isBuyer = true;
              curUser = await User.findOne({
                accountAddress: { $regex: id, $options: "i" },
              });
            } else {
              isBuyer = false;
              curUser = await SellerData.findOne({
                sellerId: { $regex: id, $options: "i" },
              });
            }
            return {
              isBuyer,
              id,
              userName: isBuyer
                ? curUser?.firstName + "" + curUser?.lastName
                : curUser.sellerName,
            };
          })
        );

        const to = await Promise.all(
          history.to.map(async (id) => {
            const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(id);
            let curUser;
            let isBuyer;
            if (isEthereumAddress) {
              isBuyer = true;
              curUser = await User.findOne({
                accountAddress: { $regex: id, $options: "i" },
              });
            } else {
              isBuyer = false;
              curUser = await SellerData.findOne({
                sellerId: { $regex: id, $options: "i" },
              });
            }
            return {
              isBuyer,
              id,
              userName: isBuyer
                ? curUser?.firstName + "" + curUser?.lastName
                : curUser.sellerName,
            };
          })
        );

        return {
          ...history,
          from,
          to,
        };
      })
    );
    res.status(200).json({
      msg: "success",
      success: true,
      data: {
        activities: updatedHistories,
        owned: ownedLicenses.length,
        joinedDate: user.timeOfCreation,
        userName: user?.firstName + "" + user?.lastName ?? "",
      },
    });
  } catch (e) {
    console.log("error in getting all activities", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getAllAccounts = async (req, res) => {
  try {
    const { accountAddress } = req.body;
    const user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    let artistAccounts = [];
    if (user) {
      if (user.role === UserRoles.Seller) {
        let sellerAccountData = user?.sellerAccountData?.find(
          (item) => item.platformTitle === PlatformTypes.spotify
        );
        artistAccounts = await SellerData.find({
          email: { $regex: sellerAccountData.associatedEmail, $options: "i" },
          platformTitle: PlatformTypes.spotify,
        });
      }
      let buyerCompanies = await Idenfy.find({
        accountAddress: { $regex: accountAddress, $options: "i" },
        userRole: UserRoles.Buyer,
      });

      let sellerCompanies = await Idenfy.find({
        accountAddress: { $regex: accountAddress, $options: "i" },
        userRole: UserRoles.Buyer,
      });

      res.status(200).json({
        success: true,
        msg: "success",
        data: {
          artistAccounts,
          buyerCompanies,
          sellerCompanies,
          socialAccounts: user.buyerAccountData,
        },
      });
    } else {
      res.status(200).json({ success: false, msg: "User not found" });
    }
  } catch (e) {
    console.log("error in getting all accounts", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  createHistory,
  getHistoryByListedId,
  getSaleDetails,
  getOfferDetails,
  getAllActivities,
  getAllAccounts,
};
