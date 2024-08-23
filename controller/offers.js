const {
  CONTRACT_AUCTION_ADDRESS,
  COMPANY_ACCOUNT_PRIVATE_KEY,
  RPC_URL,
} = require("../config");
const Offers = require("../model/offers");
const User = require("../model/user");
const auctionAbi = require("../abi/NitrilityAuction.json");
const ethers = require("ethers");
const {
  EventTypes,
  ReviewStatus,
  OfferTypes,
  UserRoles,
  LicensingTypes,
} = require("../interface");
const ListedLicenses = require("../model/listedLicenses");
const { getTemplateData } = require("../utils");
const { createHistory } = require("./history");
const { createNotification } = require("./notification");

const getMyOffersOfSeller = async (req, res) => {
  const { listedId, licensingType } = req.params;
  try {
    let query;
    if (licensingType == LicensingTypes.None) {
      query = {
        listedId: Number(listedId),
        eventType: EventTypes.OfferPlaced,
      };
    } else {
      query = {
        listedId: Number(listedId),
        licensingType: Number(licensingType),
        eventType: EventTypes.OfferPlaced,
      };
    }
    let offers = await Offers.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: "$offerId",
          offerType: { $first: "$offerType" },
          offerId: { $first: "$offerId" },
          listedId: { $first: "$listedId" },
          offerPrice: { $first: "$offerPrice" },
          offerDuration: { $first: "$offerDuration" },
          purchasedTokenURI: { $first: "$tokenURI" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          accessLevel: { $first: "$accessLevel" },
          buyerAddr: { $first: "$buyerAddr" },
          purchasedSigningData: { $first: "$signingData" },
          buyerStatus: { $first: "$buyerStatus" },
          sellerStatus: { $first: "$sellerStatus" },
          createdAt: { $first: "$createdAt" },
          offerCounts: { $sum: 1 },
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
        $unwind: {
          path: "$listedLicense",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          offerId: 1,
          offerType: 1,
          listedId: 1,
          offerPrice: 1,
          offerDuration: 1,
          purchasedTokenURI: 1,
          eventType: 1,
          licensingType: 1,
          accessLevel: 1,
          buyerAddr: 1,
          purchasedSigningData: 1,
          buyerStatus: 1,
          sellerStatus: 1,
          createdAt: 1,
          offerCounts: 1,
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
          "listedLicense.signingData": 1,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$listedLicense"],
          },
        },
      },
      { $sort: { offerPrice: 1 } },
    ]);
    offers = await Promise.all(
      offers.map(async (offer) => {
        const user = await User.findOne({
          accountAddress: { $regex: offer.buyerAddr, $options: "i" },
        });
        return {
          ...offer,
          userName: user?.firstName + " " + user?.lastName,
        };
      })
    );
    res.status(200).json({ msg: "success", success: true, data: offers });
  } catch (e) {
    console.log("error in getting all listed licenses", e);
    res.status(500);
  }
};

const getMyOffersForBuyer = async (req, res) => {
  const { accountAddress, listedId } = req.params;
  try {
    let offers = await Offers.aggregate([
      {
        $match: {
          buyer: { $regex: accountAddress, $options: "i" },
          listedId,
          eventType: EventTypes.OfferPlaced,
        },
      },
      {
        $group: {
          _id: "$offerId",
          offerType: { $first: "$offerType" },
          offerId: { $first: "$offerId" },
          listedId: { $first: "$listedId" },
          offerPrice: { $first: "$offerPrice" },
          offerDuration: { $first: "$offerDuration" },
          purchasedTokenURI: { $first: "$tokenURI" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          accessLevel: { $first: "$accessLevel" },
          buyerAddr: { $first: "$buyerAddr" },
          purchasedSigningData: { $first: "$signingData" },
          buyerStatus: { $first: "$buyerStatus" },
          sellerStatus: { $first: "$sellerStatus" },
          createdAt: { $first: "$createdAt" },
          offerCounts: { $sum: 1 },
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
        $unwind: {
          path: "$listedLicense",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          offerId: 1,
          offerType: 1,
          listedId: 1,
          offerPrice: 1,
          offerDuration: 1,
          purchasedTokenURI: 1,
          eventType: 1,
          licensingType: 1,
          accessLevel: 1,
          buyerAddr: 1,
          purchasedSigningData: 1,
          buyerStatus: 1,
          sellerStatus: 1,
          createdAt: 1,
          offerCounts: 1,
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
          "listedLicense.signingData": 1,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$listedLicense"],
          },
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: offers });
  } catch (e) {
    console.log("error in getting all listed licenses", e);
    res.status(500);
  }
};

const getMadeOffers = async (req, res) => {
  const { sellerId, accountAddress } = req.params;
  try {
    let offers = await Offers.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  $and: [
                    { buyerAddr: { $regex: accountAddress, $options: "i" } },
                    { buyerStatus: ReviewStatus.Approved },
                    { sellerStatus: ReviewStatus.Pending },
                  ],
                },
                {
                  $and: [
                    { sellerId: { $regex: sellerId, $options: "i" } },
                    { offerType: OfferTypes.CounterOffer },
                    { buyerStatus: ReviewStatus.Pending },
                    { sellerStatus: ReviewStatus.Approved },
                  ],
                },
              ],
            },
            {
              $or: [
                { eventType: EventTypes.OfferPlaced },
                { eventType: EventTypes.OfferWithdrawn },
                { eventType: EventTypes.OfferEdited },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: "$offerId",
          offerType: { $first: "$offerType" },
          offerId: { $first: "$offerId" },
          listedId: { $first: "$listedId" },
          buyerAddr: { $first: "$buyerAddr" },
          offerPrice: { $first: "$offerPrice" },
          offerDuration: { $first: "$offerDuration" },
          purchasedTokenURI: { $first: "$tokenURI" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          accessLevel: { $first: "$accessLevel" },
          purchasedSigningData: { $first: "$signingData" },
          buyerStatus: { $first: "$buyerStatus" },
          sellerStatus: { $first: "$sellerStatus" },
          offerCounts: { $sum: 1 },
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
        $unwind: {
          path: "$listedLicense",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          offerId: 1,
          offerType: 1,
          listedId: 1,
          offerPrice: 1,
          offerDuration: 1,
          purchasedTokenURI: 1,
          eventType: 1,
          licensingType: 1,
          accessLevel: 1,
          buyerAddr: 1,
          purchasedSigningData: 1,
          buyerStatus: 1,
          sellerStatus: 1,
          createdAt: 1,
          offerCounts: 1,
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
          "listedLicense.signingData": 1,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$listedLicense"],
          },
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: offers });
  } catch (e) {
    console.log("error in getting all received offers", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getReceivedOffers = async (req, res) => {
  const { sellerId, accountAddress } = req.params;
  try {
    let offers = await Offers.aggregate([
      {
        $group: {
          _id: "$offerId",
          offerId: { $first: "$offerId" },
          offerType: { $first: "$offerType" },
          listedId: { $first: "$listedId" },
          buyerAddr: { $first: "$buyerAddr" },
          offerPrice: { $first: "$offerPrice" },
          offerDuration: { $first: "$offerDuration" },
          purchasedTokenURI: { $first: "$tokenURI" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          accessLevel: { $first: "$accessLevel" },
          purchasedSigningData: { $first: "$signingData" },
          buyerStatus: { $first: "$buyerStatus" },
          sellerStatus: { $first: "$sellerStatus" },
          offerCounts: { $sum: 1 },
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
        $unwind: {
          path: "$listedLicense",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          offerId: 1,
          offerType: 1,
          listedId: 1,
          offerPrice: 1,
          offerDuration: 1,
          purchasedTokenURI: 1,
          eventType: 1,
          licensingType: 1,
          accessLevel: 1,
          buyerAddr: 1,
          purchasedSigningData: 1,
          buyerStatus: 1,
          sellerStatus: 1,
          createdAt: 1,
          offerCounts: 1,
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
          "listedLicense.signingData": 1,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$listedLicense"],
          },
        },
      },
      {
        $match: {
          eventType: EventTypes.OfferPlaced,
          $or: [
            {
              sellerId: {
                $regex: sellerId,
                $options: "i",
              },
              offerType: OfferTypes.GeneralOffer,
            },
            {
              offerType: OfferTypes.CounterOffer,
              buyerAddr: { $regex: accountAddress, $options: "i" },
            },
          ],
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: offers });
  } catch (e) {
    console.log("error in getting all received offer", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const acceptOfferBySeller = async (req, res) => {
  try {
    const { offerId, signingData } = req.body;
    if (!offerId || !signingData) {
      return res.status(400).json({ msg: "Invalid input", success: false });
    }

    const offer = await Offers.findOne({ offerId });
    if (!offer) {
      return res.status(404).json({ msg: "Offer not found", success: false });
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(COMPANY_ACCOUNT_PRIVATE_KEY, provider);

    const auctionContract = new ethers.Contract(
      CONTRACT_AUCTION_ADDRESS,
      auctionAbi,
      wallet
    );

    const revenues = offer.signingData.revenues.map((item) => ({
      ...item,
      percentage: ethers.utils.parseUnits(item.percentage.toString(), "ether"),
    }));
    const gasLimit = await auctionContract.estimateGas.acceptOffer(
      offer.offerId,
      req.user.sellerId,
      getTemplateData(signingData),
      revenues
    );

    const tx = await auctionContract.acceptOffer(
      offer.offerId,
      req.user.sellerId,
      getTemplateData(signingData),
      revenues,
      {
        gasLimit: Math.ceil(gasLimit * 1.1),
      }
    );

    await tx.wait();

    offer.signingData = signingData;
    offer.markModified("signingData");
    await offer.save();

    res
      .status(200)
      .json({ msg: "Accepted the offer successfully", success: true });
  } catch (e) {
    console.error("Error in accepting offer", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const removeOfferFromOnChain = async (offerId) => {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(COMPANY_ACCOUNT_PRIVATE_KEY, provider);
  const auctionContract = new ethers.Contract(
    CONTRACT_AUCTION_ADDRESS,
    auctionAbi,
    provider
  );
  const auctionWithSigner = auctionContract.connect(wallet);
  const tx = await auctionWithSigner.rejectOffer(offerId);
  await tx.wait();
};

const placeCounterOfferBySeller = async (req, res) => {
  try {
    const { offerId, offerPrice, offerDuration, signingData } = req.body;
    let offer = await Offers.findOne({ offerId });
    let eventType =
      offer.offerType == OfferTypes.GeneralOffer
        ? EventTypes.OfferPlaced
        : EventTypes.OfferEdited;
    if (
      req.user.role != UserRoles.Seller ||
      offer.sellerId != req.user.sellerId
    ) {
      throw new Error("You are not seller");
    }

    if (offer) {
      let listedLicense = await ListedLicenses.findOne({
        listedId: offer.listedId,
      });
      let offerType = offer.offerType;
      offer.preOffers = [
        ...offer.preOffers,
        {
          offerPrice: offer.offerPrice,
          offerType,
          offerDuration,
          tokenURI: offer.tokenURI,
          signingData: offer.signingData,
        },
      ];
      offer.offerType = OfferTypes.CounterOffer;
      offer.offerPrice = offerPrice;
      offer.offerDuration = offerDuration;
      offer.signingData = signingData;
      offer.buyerStatus = ReviewStatus.Pending;
      offer.sellerStatus = ReviewStatus.Approved;
      offer.createdAt = Date.now();

      offer.markModified("signingData");
      offer.markModified("preOffers");
      updatedOffer = await offer.save();

      await createHistory(
        eventType,
        offer.listedId,
        [offer.licensingType],
        offerId,
        offerPrice,
        offer.accessLevel,
        offer.offerDuration,
        [offer.sellerId],
        [offer.buyerAddr],
        offer.offerType
      );
      await createNotification(
        eventType,
        offer.buyerAddr,
        offer.sellerId,
        listedLicense.licenseName,
        true,
        OfferTypes.CounterOffer,
        offerPrice
      );
      res
        .status(200)
        .json({ success: true, msg: "Offer updated successfully" });
    } else {
      res.status(500).json({ success: false, msg: "Offer not found " });
    }
  } catch (e) {
    console.log("error in placing counter offer", e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const withdrawCounterOffer = async (req, res) => {
  try {
    const { offerId } = req.body;
    let offer = await Offers.findOne({ offerId });
    if (offer) {
      let listedLicense = await ListedLicenses.findOne({
        listedId: offer.listedId,
      });
      let offerType = offer.offerType;
      offer.eventType = EventTypes.OfferWithdrawn;
      const lastElement = offer.preOffers.pop();
      offer.offerType = lastElement.offerType;
      offer.offerPrice = lastElement.offerPrice;
      offer.offerDuration = lastElement.offerDuration;
      offer.tokenURI = lastElement.tokenURI;
      offer.signingData = lastElement.signingData;

      offer.markModified("preOffers");
      offer.markModified("signingData");
      await offer.save();
      await createHistory(
        EventTypes.OfferWithdrawn,
        offer.listedId,
        [offer.licensingType],
        offer.offerId,
        offer.offerPrice,
        offer.accessLevel,
        offer.offerDuration,
        [listedLicense.sellerId],
        [offer.buyerAddr],
        offerType
      );
      await createNotification(
        EventTypes.OfferWithdrawn,
        offer.buyerAddr,
        listedLicense.sellerId,
        listedLicense.licenseName,
        true,
        offer.offerType,
        offer.offerPrice
      );
      res.status(200).json({
        success: true,
        msg: "You have Withdrawn your offer successfully",
      });
    } else {
      res.status(200).json({ success: false, msg: "There is no offer" });
    }
  } catch (e) {
    console.log("error in withdrawing counter offer", e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const rejectOfferBySeller = async (req, res) => {
  try {
    const { offerId } = req.params;
    let offer = await Offers.findOne({ offerId });
    let isSeller =
      req.user.role == UserRoles.Seller || offer.sellerId == req.user.sellerId;
    if (offer) {
      if (!isSeller) {
        throw new Error("You are not seller");
      }
      await removeOfferFromOnChain(offerId);
      res.status(200).json({
        success: true,
        msg: "You have rejected counter offer successfully",
      });
    } else {
      res.status(200).json({ success: false, msg: "There is no offer" });
    }
  } catch (e) {
    console.log("error in withdrawing counter offer", e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const editCountOffer = async (req, res) => {
  try {
    const { offerId, offerPrice, offerDuration, tokenURI, signingData } =
      req.params;
    let offer = await Offers.findOne({ offerId });
    if (offer) {
      let listedLicense = await ListedLicenses.findOne({
        listedId: offer.listedId,
      });
      let isSeller =
        req.user.role == UserRoles.Seller ||
        offer.sellerId == req.user.sellerId;

      if (!isSeller) {
        throw new Error("You are not seller");
      }

      offer.preOffers = [
        ...offer.preOffers,
        {
          offerPrice: offer.offerPrice,
          offerType: offer.offerType,
          offerDuration: offer.offerDuration,
          tokenURI: offer.tokenURI,
          signingData: offer.signingData,
        },
      ];
      offer.offerPrice = offerPrice;
      offer.offerDuration = offerDuration;
      offer.tokenURI = tokenURI;
      offer.signingData = signingData;
      offer.sellerStatus = ReviewStatus.Approved;
      offer.buyerStatus = ReviewStatus.Pending;
      offer.offerType = OfferTypes.CounterOffer;
      offer.markModified("preOffers");
      await offer.save();

      await createHistory(
        EventTypes.OfferEdited,
        offer.listedId,
        [offer.licensingType],
        offerId,
        offerPrice,
        offer.accessLevel,
        offer.offerDuration,
        [offer.sellerId],
        [offer.buyerAddr],
        offer.offerType
      );
      await createNotification(
        EventTypes.OfferEdited,
        offer.buyerAddr,
        offer.sellerId,
        listedLicense.licenseName,
        true,
        OfferTypes.CounterOffer,
        offerPrice
      );
      res.status(200).json({ success: true, msg: "Updated the offer" });
    } else {
      res.status(200).json({ success: false, msg: "There is no offer" });
    }
  } catch (e) {
    console.log("error in withdrawing counter offer", e);
    res.status(500).json({ success: false, msg: e.message });
  }
};

const getTotalOffers = async (req, res) => {
  try {
    const { sellerId } = req.body;
    const offers = await Offers.aggregate([
      {
        // Match documents that have the createdAt field
        $match: {
          sellerId: { $regex: sellerId, $options: "i" },
        },
      },
      {
        // Project the year and month from the createdAt timestamp
        $project: {
          year: { $year: { $toDate: "$createdAt" } },
          month: { $month: { $toDate: "$createdAt" } },
          day: { $dayOfMonth: { $toDate: "$createdAt" } },
          offerPrice: 1,
        },
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            day: "$day",
          },
          totalPrice: { $sum: "$offerPrice" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: offers });
  } catch (e) {
    console.log("error in getting total offers", e);
    res.status(500).json({ message: e.message });
  }
};

module.exports = {
  getMyOffersForBuyer,
  getMyOffersOfSeller,
  getMadeOffers,
  getReceivedOffers,
  rejectOfferBySeller,
  acceptOfferBySeller,
  placeCounterOfferBySeller,
  withdrawCounterOffer,
  editCountOffer,
  getTotalOffers,
};
