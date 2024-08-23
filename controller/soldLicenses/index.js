const SoldLicenses = require("../../model/soldLicenses");
const User = require("../../model/user");
const Recommendation = require("../../model/recommendation");
const ListedLicenses = require("../../model/listedLicenses");
const { EventTypes, LicensingTypes } = require("../../interface");
const Idenfy = require("../../model/idenfy");
const { SELLER_IDX, BUYER_IDX } = require("../../config");
const Offers = require("../../model/offers");
const PublicProfile = require("../../model/publicProfile");
const { returnedListedLicenseQuery } = require("./queries");
const {
  listedLicenseQuery,
  pendingLicenseQuery,
} = require("../listedLicenses/queries");
const io = require("../../io").io();

const deleteRecommendedLicense = async (req, res) => {
  const { buyerAddress, sellerAddress, price, userIds, recommendedId } =
    req.body;
  let recommendedLicense = null;
  try {
    user = await User.findOne({
      accountAddress: { $regex: buyerAddress, $options: "i" },
    });
    if (user) {
      user.isLocked = false;
      await user.save();
      io.emit("user-lock", {
        id: user._id,
        isLocked: false,
      });
    }

    recommendedLicense = await Recommendation.findById(recommendedId);

    if (recommendedLicense) {
      let recommended = await Recommendation.findById(recommendedId);
      recommended.status = 2;
      await recommended.save();
      res.status(200).json({ msg: "success", success: true });
    } else {
      res
        .status(200)
        .json({ msg: "already purchased the nft", success: false });
    }
    res.status(200).json({ msg: "success", success: true });
  } catch (err) {
    console.log(err);
    res.status(200).json({ msg: "something went wrong", success: false });
  }
};

// group by license name
const getSoldLicenses = async (req, res) => {
  const { sellerId } = req.params;
  try {
    let soldLicenses = await SoldLicenses.aggregate([
      { $match: { sellerId: { $regex: sellerId, $options: "i" } } },
      {
        $group: {
          _id: "$tokenId",
          sellerId: { $first: "$sellerId" },
          listedId: { $first: "$listedId" },
          purchasedTokenURI: { $first: "$tokenURI" },
          tokenId: { $first: "$tokenId" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          accessLevel: { $first: "$accessLevel" },
          buyerAddress: { $first: "$buyerAddress" },
          price: { $first: "$price" },
          createdAt: { $first: "$createdAt" },
          countOfLicenses: { $sum: 1 },
          totalPrice: { $sum: "$price" },
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
          sellerId: 1,
          listedId: 1,
          purchasedTokenURI: 1,
          tokenId: 1,
          eventType: 1,
          licensingType: 1,
          accessLevel: 1,
          buyerAddress: 1,
          price: 1,
          createdAt: 1,
          countOfLicenses: 1,
          ...returnedListedLicenseQuery,
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

    soldLicenses = await Promise.all(
      soldLicenses.map(async (soldLicense) => {
        const user = await User.findOne({
          accountAddress: { $regex: soldLicense.buyerAddress, $options: "i" },
        });
        return {
          ...soldLicense,
          userName: user.firstName + " " + user.lastName,
        };
      })
    );

    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    console.log(e);
    res.status(500).json({ msg: "success", success: false });
  }
};

// get owned licenses
const getOwnedLicense = async (req, res) => {
  try {
    const { accountAddress, searchFilter } = req.body;
    const { keyword } = searchFilter;

    const soldLicenses = await SoldLicenses.aggregate([
      {
        $match: {
          buyerAddress: { $regex: accountAddress, $options: "i" },
        },
      },
      {
        $group: {
          _id: "$tokenId",
          sellerId: { $first: "$sellerId" },
          listedId: { $first: "$listedId" },
          purchasedTokenURI: { $first: "$tokenURI" },
          tokenId: { $first: "$tokenId" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          buyerAddress: { $first: "$buyerAddress" },
          price: { $first: "$price" },
          createdAt: { $first: "$createdAt" },
          countOfLicenses: { $sum: 1 },
          totalPrice: { $sum: "$price" },
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
          sellerId: 1,
          listedId: 1,
          purchasedTokenURI: 1,
          tokenId: 1,
          eventType: 1,
          licensingType: 1,
          buyerAddress: 1,
          price: 1,
          createdAt: 1,
          countOfLicenses: 1,
          ...returnedListedLicenseQuery,
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
        $sort: { totalPrice: -1 },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    console.log(e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getTopArtist = async (req, res) => {
  const { time } = req.params;
  const now = new Date();
  let startTime;
  switch (time) {
    case "Today":
      startTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();
      break;
    case "This week":
      const first = now.getDate() - now.getDay();
      startTime = new Date(now.getFullYear(), now.getMonth(), first).getTime();
      break;
    case "This month":
      startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      break;
    case "All time":
      startTime = new Date(0).getTime;
      break;
    default:
      return res
        .status(400)
        .json({ msg: "Invalid time filter", success: false });
  }

  const endTime = new Date().getTime();
  try {
    let soldLicenses = await SoldLicenses.aggregate([
      {
        $match: {
          createdAt: {
            $gt: startTime,
            $lt: endTime,
          },
        },
      },
      {
        $group: {
          _id: "$sellerAddress",
          sellerAddress: { $first: "$sellerAddress" },
          sellerId: { $first: "$sellerId" },
          totalPrice: { $sum: "$price" },
          averagePrice: { $avg: "$price" },
          countOfLicenses: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "publicprofiles",
          localField: "sellerId",
          foreignField: "sellerId",
          as: "publicData",
        },
      },
      {
        $unwind: {
          path: "$publicData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sellerdatas",
          localField: "sellerId",
          foreignField: "sellerId",
          as: "sellerData",
        },
      },
      {
        $unwind: {
          path: "$sellerData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          publicData: { $exists: true },
        },
      },
      {
        $sort: { totalPrice: -1 },
      },
    ]);
    soldLicenses = await Promise.all(
      soldLicenses.map(async (license) => {
        const listed = await ListedLicenses.find({
          sellerId: license.sellerId,
        });
        return { ...license, countOfLicenses: listed.length };
      })
    );

    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    console.log("error in getting trending music", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const getTopSellingLicense = async (req, res) => {
  try {
    const { time } = req.params;
    const oneDay = 24 * 60 * 60 * 1000;
    const endTime = new Date().getTime();
    const startTime = endTime - time * oneDay;
    let soldLicenses = await SoldLicenses.aggregate([
      {
        $match: {
          createdAt: {
            $gt: startTime,
            $lt: endTime,
          },
        },
      },
      {
        $group: {
          _id: "$listedId",
          listedId: { $first: "$listedId" },
          purchasedTokenURI: { $first: "$tokenURI" },
          price: { $first: "$price" },
          records: { $push: "$$ROOT" },
          totalPrice: { $sum: "$price" },
          createdAt: { $first: "$createdAt" },
          countOfLicenses: { $sum: 1 },
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
          listedId: 1,
          purchasedTokenURI: 1,
          price: 1,
          records: 1,
          totalPrice: 1,
          createdAt: 1,
          countOfLicenses: 1,
          ...returnedListedLicenseQuery,
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
        $match: listedLicenseQuery, // Filter only listed licenses
      },
      {
        $sort: { totalPrice: -1 },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// Most Popular licenses
const getMostPopularLicenses = async (req, res) => {
  try {
    const { sellerId } = req.body;
    let soldLicenses = await SoldLicenses.aggregate([
      {
        $match: {
          sellerId: { $regex: sellerId, $options: "i" },
        },
      },
      {
        $group: {
          _id: "$listedId",
          listedId: { $first: "$listedId" },
          purchasedTokenURI: { $first: "$tokenURI" },
          price: { $first: "$price" },
          records: { $push: "$$ROOT" },
          totalPrice: { $sum: "$price" },
          createdAt: { $first: "$createdAt" },
          countOfLicenses: { $sum: 1 },
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
          listedId: 1,
          purchasedTokenURI: 1,
          price: 1,
          records: 1,
          totalPrice: 1,
          createdAt: 1,
          countOfLicenses: 1,
          ...returnedListedLicenseQuery,
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
        $match: listedLicenseQuery, // Filter only listed licenses
      },
      {
        $sort: { totalPrice: -1 },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// orders percentage by license type
const getOrdersByLicenseType = async (req, res) => {
  try {
    const { sellerId } = req.body;
    let soldLicenses = await SoldLicenses.aggregate([
      {
        $match: {
          sellerId: { $regex: sellerId, $options: "i" },
        },
      },
      {
        $group: {
          _id: "$licensingType",
          licensingType: { $first: "$licensingType" },
          listedId: { $first: "$listedId" },
          price: { $first: "$price" },
          totalPrice: { $sum: "$price" },
          createdAt: { $first: "$createdAt" },
          countOfLicenses: { $sum: 1 },
        },
      },
      {
        $sort: { countOfLicenses: -1 },
      },
      {
        $group: {
          _id: null,
          totalLicenses: { $sum: "$countOfLicenses" },
          data: { $push: "$$ROOT" },
        },
      },
      {
        $unwind: "$data",
      },
      {
        $project: {
          _id: "$data._id",
          licensingType: "$data.licensingType",
          listedId: "$data.listedId",
          price: "$data.price",
          totalPrice: "$data.totalPrice",
          createdAt: "$data.createdAt",
          countOfLicenses: "$data.countOfLicenses",
          percentage: {
            $multiply: [
              { $divide: ["$data.countOfLicenses", "$totalLicenses"] },
              100,
            ],
          },
        },
      },
      {
        $sort: { countOfLicenses: -1 },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// sale volume by month - year
const getSaleVolumeByMonth = async (req, res) => {
  try {
    const { sellerId } = req.body;
    const result = await SoldLicenses.aggregate([
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
          price: 1,
        },
      },
      {
        // Group by the year and month fields
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            day: "$day",
          },
          totalSalesVolume: { $sum: "$price" },
          count: { $sum: 1 },
        },
      },
      {
        // Sort by year and month
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: result });
  } catch (e) {
    console.log("error in getting sale volume by month", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

// Trending Music Now
const getTrendingLicense = async (req, res) => {
  const { time } = req.params;
  const oneDay = 60 * 60 * 1000;
  const endTime = new Date().getTime();
  const startTime = endTime - time * oneDay;

  try {
    let soldLicenses = await SoldLicenses.aggregate([
      {
        $match: {
          createdAt: {
            $gt: startTime,
            $lt: endTime,
          },
        },
      },
      {
        $group: {
          _id: "$listedId",
          listedId: { $first: "$listedId" },
          purchasedTokenURI: { $first: "$tokenURI" },
          createdAt: { $first: "$createdAt" },
          price: { $first: "$price" },
          records: { $push: "$$ROOT" },
          countOfLicenses: { $sum: 1 },
          totalPrice: { $sum: "$price" },
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
          listedId: 1,
          purchasedTokenURI: 1,
          price: 1,
          records: 1,
          totalPrice: 1,
          createdAt: 1,
          countOfLicenses: 1,
          ...returnedListedLicenseQuery,
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
        $match: listedLicenseQuery, // Filter only listed licenses
      },
      {
        $sort: { countOfLicenses: -1 },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: soldLicenses });
  } catch (e) {
    console.log("error in getting trending music", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const getPurchasedNonExclusive = async (req, res) => {
  try {
    const { listedId } = req.params;
    const purchasedLicenses = await SoldLicenses.find({
      listedId: listedId,
      $or: [
        {
          $and: [
            { eventType: EventTypes.OfferAccepted },
            { licensingType: { $gt: LicensingTypes.MovieSync } },
          ],
        },
        {
          $and: [
            { eventType: EventTypes.SaleAccepted },
            { licensingType: { $gt: LicensingTypes.MovieSync } },
          ],
        },
      ],
    });
    res.status(200).json({
      msg: "You are purchased non exclusive license",
      success: true,
      data: purchasedLicenses,
    });
  } catch (e) {
    console.log("error in checking if user purchased exclusive license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getPublicLicense = async (req, res) => {
  try {
    const { tokenId, accountAddress } = req.params;
    const soldLicense = await SoldLicenses.findOne({ tokenId }).lean();
    if (
      soldLicense &&
      (accountAddress.toLowerCase() == soldLicense.buyerAddress.toLowerCase() ||
        soldLicense.publicLinked)
    ) {
      const listedLicense = await ListedLicenses.findOne({
        listedId: soldLicense.listedId,
      }).lean();
      const sellers = await User.find({
        "sellerAccountData.sellerId": {
          $regex: soldLicense.sellerId,
          $options: "i",
        },
      });
      let sellerEmails = [],
        sellerCompanies = [];
      await Promise.all(
        sellers?.map(async (user) => {
          const sellerIdenfies = await Idenfy.find({
            clientId: {
              $regex: user.accountAddress + SELLER_IDX,
              $options: "i",
            },
          });

          sellerEmails.push(user.email);
          sellerIdenfies?.map((item) => {
            sellerCompanies.push(item?.companyName);
          });
        })
      );
      const buyerIdenfy = await Idenfy.findOne({
        clientId: {
          $regex: soldLicense.buyerAddress + BUYER_IDX,
          $options: "i",
        },
      });
      res.status(200).json({
        msg: "Success",
        success: true,
        data: {
          ...soldLicense,
          listedLicense,
          sellerInfo: {
            sellerEmails,
            sellerCompanies,
          },
          buyerInfo: buyerIdenfy?.companyName,
        },
      });
    } else {
      res
        .status(200)
        .json({ msg: "This License is not published yet", success: false });
    }
  } catch (e) {
    console.log("error in getting public license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const publishLicense = async (req, res) => {
  try {
    const { tokenId } = req.params;
    await SoldLicenses.findOneAndUpdate({ tokenId }, { publicLinked: true });
    res.status(200).json({ msg: "Successfully Published", success: true });
  } catch (e) {
    console.log("error in publishing public license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getTotalOwners = async (req, res) => {
  try {
    const { listedId } = req.body;
    const soldLicenses = await SoldLicenses.find({ listedId });
    res.status(200).json({
      msg: "error in getting total owners",
      success: true,
      data: soldLicenses.length,
    });
  } catch (e) {
    console.log("error in getting total owners", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getSaleStats = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const soldLicenses = await SoldLicenses.aggregate([
      { $match: { sellerId: { $regex: sellerId, $options: "i" } } },
      {
        $group: {
          _id: "$sellerId",
          sellerId: { $first: "$sellerId" },
          listedId: { $first: "$listedId" },
          purchasedTokenURI: { $first: "$tokenURI" },
          tokenId: { $first: "$tokenId" },
          eventType: { $first: "$eventType" },
          licensingType: { $first: "$licensingType" },
          accessLevel: { $first: "$accessLevel" },
          buyerAddress: { $first: "$buyerAddress" },
          price: { $first: "$price" },
          createdAt: { $first: "$createdAt" },
          totalSales: { $sum: 1 },
          payouts: { $sum: "$price" },
        },
      },
      {
        $project: {
          _id: 1,
          totalSales: 1,
          payouts: 1,
        },
      },
    ]);

    const listedLicenses = await ListedLicenses.find({
      sellerId: { $regex: sellerId, $options: "i" },
      ...listedLicenseQuery,
    });

    const publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    const totalOffers = await Offers.find({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    const pendingOffers = await Offers.aggregate([
      {
        $match: {
          sellerId: { $regex: sellerId, $options: "i" },
          eventType: EventTypes.OfferPlaced,
        },
      },
      {
        $group: {
          _id: "$sellerId",
          offerId: { $first: "$offerId" },
          offerPrice: { $first: "$offerPrice" },
          pendingCounts: { $sum: 1 },
          totalPrice: { $sum: "$offerPrice" },
        },
      },
    ]);

    let pendingListings = await ListedLicenses.aggregate([
      {
        $match: {
          artists: {
            $elemMatch: {
              id: { $regex: sellerId, $options: "i" },
            },
          },
          ...pendingLicenseQuery,
        },
      },
    ]);

    res.status(200).json({
      msg: "success",
      success: true,
      data: {
        totalSales: soldLicenses[0]?.totalSales ?? 0,
        payouts: soldLicenses[0]?.payouts ?? 0,
        totalOffers: totalOffers.length,
        totalVisitors: publicProfile.visitors?.length ?? 0,
        listings: listedLicenses.length ?? 0,
        pendingOfferCounts: pendingOffers[0]?.pendingCounts ?? 0,
        pendingOfferPrice: pendingOffers[0]?.totalPrice ?? 0,
        pendingListings: pendingListings.length ?? 0,
      },
    });
  } catch (e) {
    console.log("error in getting sale stats", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  deleteRecommendedLicense,
  getSoldLicenses,
  getTopArtist,
  getTopSellingLicense,
  getTrendingLicense,
  getMostPopularLicenses,
  getOrdersByLicenseType,
  getSaleVolumeByMonth,
  getOwnedLicense,
  getPurchasedNonExclusive,
  getPublicLicense,
  publishLicense,
  getTotalOwners,
  getSaleStats,
};
