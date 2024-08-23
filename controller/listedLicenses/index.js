const ListedLicenses = require("../../model/listedLicenses");
const User = require("../../model/user");
const SellerData = require("../../model/sellerData");
const SoldLicenses = require("../../model/soldLicenses");
const { saveAudioFeaturesByTrackId } = require("../spotify");
const { createNotification } = require("../notification");
const { createHistory } = require("../history");
const {
  ListingStatusTypes,
  EventTypes,
  LicensingTypes,
  ReviewStatus,
} = require("../../interface");
const { getPublicIP } = require("../../utils");
const {
  unlistedLicenseQuery,
  listedLicenseQuery,
  pendingLicenseQuery,
} = require("./queries");

// search licenses on dashboard
const searchLicenses = async (req, res) => {
  const {
    type,
    name,
    licenseName,
    isFilter,
    duration,
    tempo,
    licensingTypeFilter,
  } = req.body;
  let licenses = [];
  if (isFilter) {
    try {
      let lengthQuery = {};
      if (duration.max > 0) {
        lengthQuery.$gte = duration.min;
        lengthQuery.$lte = duration.max;
      } else {
        lengthQuery.$gte = duration.min;
      }

      let tempoQuery = [];
      if (tempo.slowChecked) {
        tempoQuery.push({ tempo: { $gte: 60, $lte: 100 } });
      }
      if (tempo.moderateChecked) {
        tempoQuery.push({ tempo: { $gte: 110, $lte: 140 } });
      }
      if (tempo.fastChecked) {
        tempoQuery.push({ tempo: { $gte: 150, $lte: 190 } });
      }
      if (tempo.veryFastChecked) {
        tempoQuery.push({ tempo: { $gte: 200, $lte: 240 } });
      }

      let typeQuery = [];
      if (licensingTypeFilter[0]) {
        typeQuery.push(creatorQuery);
      }
      if (licensingTypeFilter[1]) {
        typeQuery.push(advertisementQuery);
      }
      if (licensingTypeFilter[2]) {
        typeQuery.push(tvSeriesQuery);
      }
      if (licensingTypeFilter[3]) {
        typeQuery.push(movieQuery);
      }
      if (licensingTypeFilter[4]) {
        typeQuery.push(videoGameQuery);
      }
      if (licensingTypeFilter[5]) {
        typeQuery.push(aiTrainingQuery);
      }
      let query;
      if (type && name) {
        query = { genres: { $in: [name] }, length: lengthQuery };
      } else {
        query = {
          licenseName: { $regex: new RegExp(licenseName, "i") },
          length: lengthQuery,
        };
      }
      if (tempoQuery.length && typeQuery.length) {
        query.$and = [{ $or: tempoQuery }, { $or: typeQuery }];
      } else if (tempoQuery.length) {
        query.$or = tempoQuery;
      } else if (typeQuery.length) {
        query.$or = typeQuery;
      }
      const filteredLicenses = await ListedLicenses.find(query);
      res
        .status(200)
        .json({ msg: "success", success: true, data: filteredLicenses });
    } catch (e) {
      console.log("error in searching licenses", e);
      res.status(500);
    }
  } else {
    if (type && name) {
      licenses = await ListedLicenses.find({ genres: { $in: [name] } });
    } else {
      if (!licenseName || licenseName === "") {
        licenses = await ListedLicenses.find({ genres: { $in: [name] } });
      } else {
        licenses = await ListedLicenses.find({
          licenseName: { $regex: licenseName, $options: "i" },
        });
      }
    }

    res.status(200).json({ msg: "success", success: true, data: licenses });
  }
};

const checkduplication = async (req, res) => {
  try {
    const { trackId } = req.body;
    const listedLicense = await ListedLicenses.findOne({
      trackId,
    });
    if (listedLicense) {
      res.status(200).json({
        msg: "success",
        success: true,
        data: {
          listedLicense,
        },
      });
    } else {
      res.status(200).json({
        msg: "success",
        success: true,
        data: {
          listedLicense: null,
        },
      });
    }
  } catch (error) {
    console.log("error in checking duplicated license", error);
    return res.status(500).json({ msg: "failed", success: false });
  }
};

const getListedLicenseBySellerId = async (req, res) => {
  const { sellerId } = req.params;
  try {
    const listedLicenses = await ListedLicenses.find({
      sellerId: { $regex: sellerId, $options: "i" },
      ...listedLicenseQuery,
    });
    res
      .status(200)
      .json({ msg: "success", success: true, data: listedLicenses });
  } catch (e) {
    console.log("error in getting all listed licenses", e);
    res.status(500);
  }
};

const getAllUnLicensesBySellerId = async (req, res) => {
  const { sellerId } = req.params;
  try {
    const unlists = await ListedLicenses.aggregate(
      unlistedLicenseQuery(sellerId)
    );
    res.status(200).json({ msg: "success", success: true, data: unlists });
  } catch (e) {
    console.log("error in getting all listed licenses", e);
    res.status(500);
  }
};

const getAllLicenses = async (req, res) => {
  try {
    const listedLicenses = await ListedLicenses.find({
      ...listedLicenseQuery,
    });
    res
      .status(200)
      .json({ msg: "success", success: true, data: listedLicenses });
  } catch (e) {
    console.log("error in getting all listed licenses", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getRecentUploads = async (req, res) => {
  try {
    ListedLicenses.find({
      ...listedLicenseQuery,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec((err, items) => {
        if (err) {
          console.log("error in getting recent uploads", err);
          // Handle error appropriately
          res.status(200).json({ msg: "failed", success: false, data: [] });
        } else {
          // Do something with the retrieved items
          res.status(200).json({ msg: "success", success: true, data: items });
        }
      });
  } catch (e) {
    console.log("error in getting recent uploads", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const unlistLicense = async (req, res) => {
  try {
    const { listedId, licensingType } = req.body;
    // Ensure listedLicense is found before proceeding
    let listedLicense = await ListedLicenses.findOne({ listedId });
    if (!listedLicense) {
      return res.status(404).json({
        msg: "License not found",
        success: false,
      });
    }

    // Assuming sellerData is used later; ensure it's found
    const sellerData = await SellerData.findOne({
      sellerId: listedLicense.sellerId,
    });
    if (!sellerData) {
      return res.status(404).json({
        msg: "Seller data not found",
        success: false,
      });
    }

    // Update the listed status based on licensingType
    let signingDataPath;

    switch (licensingType) {
      case LicensingTypes.Creator:
        signingDataPath = `signingData.creator.listed`;
        break;
      case LicensingTypes.Movie:
        signingDataPath = `signingData.movie.listed`;
        break;
      case LicensingTypes.Advertisement:
        signingDataPath = `signingData.advertisement.listed`;
        break;
      case LicensingTypes.VideoGame:
        signingDataPath = `signingData.videoGame.listed`;
        break;
      case LicensingTypes.TvSeries:
        signingDataPath = `signingData.tvSeries.listed`;
        break;
      case LicensingTypes.AiTraining:
        signingDataPath = `signingData.aiTraining.listed`;
        break;
    }
    listedLicense.set(signingDataPath, ListingStatusTypes.UnListed); // Use .set() to update the path

    // Save the updated document
    await listedLicense.save();

    // Assuming createHistory() is an async operation and doesn't throw errors that should stop execution
    await createHistory(
      EventTypes.LicenseTypeUnlisted,
      listedId,
      [licensingType],
      null,
      null,
      null,
      null,
      [listedLicense.sellerId],
      []
    );

    // Successfully unlisted
    res.status(200).json({
      msg: "Successfully unlisted",
      success: true,
      data: listedLicense,
    });
  } catch (e) {
    console.error("error in unlistLicense", e); // Use console.error for errors
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const unlistLicenseAll = async (req, res) => {
  try {
    const { listedId } = req.body;
    let listedLicense = await ListedLicenses.findOne({ listedId });
    if (listedLicense) {
      let signingData = {
        creator: {
          ...listedLicense.signingData.creator,
          listed: ListingStatusTypes.UnListed,
        },
        movie: {
          ...listedLicense.signingData.movie,
          listed: ListingStatusTypes.UnListed,
        },
        advertisement: {
          ...listedLicense.signingData.advertisement,
          listed: ListingStatusTypes.UnListed,
        },
        videoGame: {
          ...listedLicense.signingData.videoGame,
          listed: ListingStatusTypes.UnListed,
        },
        tvSeries: {
          ...listedLicense.signingData.tvSeries,
          listed: ListingStatusTypes.UnListed,
        },
        aiTraining: {
          ...listedLicense.signingData.aiTraining,
          listed: ListingStatusTypes.UnListed,
        },
      };
      listedLicense.signingData = signingData;
      listedLicense.markModified("signingData");
      await listedLicense.save();

      await createHistory(
        EventTypes.SongUnlisted,
        listedId,
        LicensingTypes.All,
        null,
        null,
        null,
        null,
        [listedLicense.sellerId],
        []
      );

      await createNotification(
        EventTypes.SongUnlisted,
        "",
        listedLicense.sellerId,
        listedLicense.licenseName,
        true
      );
      res
        .status(200)
        .json({ msg: "Success", success: true, data: listedLicense });
    } else {
      res.status(200).json({ msg: "There is no license", success: false });
    }
  } catch (e) {
    console.log("error in unlistlicense", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

async function updateAllRevenueStatuses(listedId, sellerId, newStatus) {
  try {
    // Fetch the document you want to update
    let listedLicense = await ListedLicenses.findOne({ listedId });

    if (!listedLicense) {
      console.log("No document found with the specified listedId.");
      return;
    }

    // Iterate over each property in signingData
    for (let licensingType in listedLicense.signingData) {
      if (listedLicense.signingData.hasOwnProperty(licensingType)) {
        // Check if the licensing type has a revenues array
        if (Array.isArray(listedLicense.signingData[licensingType].revenues)) {
          // Update the status for the matching sellerId in the revenues array
          listedLicense.signingData[licensingType].revenues.forEach(
            (revenue) => {
              if (revenue.sellerId === sellerId) {
                revenue.status = newStatus;
              }
            }
          );
        }
      }
    }

    // Mark the signingData as modified and save the document
    listedLicense.markModified("signingData");
    await listedLicense.save();

    console.log("Document updated successfully");
    return true;
  } catch (e) {
    throw new Error(e);
  }
}

const approveLicense = async (req, res) => {
  try {
    const { listedId } = req.params;
    let sellerId = req.user.sellerId;
    await updateAllRevenueStatuses(listedId, sellerId, ReviewStatus.Approved);
    res
      .status(200)
      .json({ msg: "Approved the license successfully", success: true });
  } catch (e) {
    console.log("error in approve license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const rejectLicense = async (req, res) => {
  try {
    const { listedId } = req.params;
    let sellerId = req.user.sellerId;
    await updateAllRevenueStatuses(listedId, sellerId, ReviewStatus.Rejected);
    res
      .status(200)
      .json({ msg: "Rejected the license successfully", success: true });
  } catch (e) {
    console.log("error in rejectLicense", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getLicensingTypes = (signingData) => {
  let licensingTypes = [];
  if (signingData.creator.listed === ListingStatusTypes.Listed) {
    licensingTypes = [...licensingTypes, LicensingTypes.Creator];
  }
  if (signingData.movie.listed === ListingStatusTypes.Listed) {
    licensingTypes = [...licensingTypes, LicensingTypes.Movie];
  }
  if (signingData.advertisement.listed === ListingStatusTypes.Listed) {
    licensingTypes = [...licensingTypes, LicensingTypes.Advertisement];
  }
  if (signingData.tvSeries.listed === ListingStatusTypes.Listed) {
    licensingTypes = [...licensingTypes, LicensingTypes.TvSeries];
  }
  if (signingData.videoGame.listed === ListingStatusTypes.Listed) {
    licensingTypes = [...licensingTypes, LicensingTypes.VideoGame];
  }
  if (signingData.aiTraining.listed === ListingStatusTypes.Listed) {
    licensingTypes = [...licensingTypes, LicensingTypes.AiTraining];
  }

  return licensingTypes;
};
const uploadLicenseData = async (req, res) => {
  try {
    const { licenseData } = req.body;
    let listedLicense = await ListedLicenses.findOne({
      trackId: licenseData.trackId,
      sellerId: licenseData.sellerId,
    });
    const licensingTypes = getLicensingTypes(licenseData.signingData);
    if (listedLicense) {
      listedLicense.signingData = licenseData.signingData;
      listedLicense.markModified("signingData");
      await listedLicense.save();
      const licensingTypes = getLicensingTypes(licenseData.signingData);
      await createHistory(
        EventTypes.Listed,
        listedLicense.listedId,
        licensingTypes,
        null,
        null,
        null,
        null,
        [listedLicense.sellerId],
        []
      );

      await createNotification(
        EventTypes.Listed,
        "",
        listedLicense.sellerId,
        listedLicense.licenseName,
        true
      );
    } else {
      const audio = await saveAudioFeaturesByTrackId(
        licenseData.trackId,
        licenseData.artists
      );

      listedLicense = await ListedLicenses.create({
        visitors: [],
        tokenURI: licenseData.tokenURI,
        licenseName: licenseData.licenseName,
        albumName: licenseData.albumName,
        albumId: licenseData.albumId,
        sellerName: licenseData.sellerName,
        sellerId: licenseData.sellerId,
        imagePath: licenseData.imagePath,
        avatarPath: licenseData.avatarPath,
        sellerAddress: licenseData.sellerAddress,
        previewUrl: licenseData.previewUrl,
        artists: licenseData.artists,
        trackId: licenseData.trackId,
        length: audio.duration_ms,
        acousticness: audio.acousticness,
        danceability: audio.danceability,
        energy: audio.energy,
        instrumentalness: audio.instrumentalness,
        liveness: audio.liveness,
        mode: audio.mode,
        tempo: audio.tempo,
        genres:
          licenseData.genres.length > 0 ? licenseData.genres : ["Hip Hop"],
        signingData: licenseData.signingData,
      });

      await createHistory(
        EventTypes.Listed,
        listedLicense.listedId,
        licensingTypes,
        listedLicense.listedId,
        null,
        null,
        null,
        [listedLicense.sellerId],
        []
      );

      await createNotification(
        EventTypes.Listed,
        "",
        listedLicense.sellerId,
        listedLicense.licenseName,
        true
      );
    }

    res.status(200).json({
      msg: "Successfully Minted",
      success: true,
      data: listedLicense,
    });
  } catch (e) {
    console.log("error in listing license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const adjustLicense = async (req, res) => {
  try {
    const { listedId, signingData } = req.body;
    let listedLicense = await ListedLicenses.findOne({ listedId });
    listedLicense.signingData = signingData;
    listedLicense.markModified("signingData");
    await listedLicense.save();

    // await createHistory(
    //   listedLicense.listedId,
    //   syncData.fPrice,
    //   EventTypes.Edited,
    //   licensingType,
    //   AccessLevels.None,
    //   listedLicense.sellerName,
    //   req.user.accountAddress,
    //   syncData.infiniteSupply ? INFINITE : syncData.totalSupply
    // );

    await createNotification(
      EventTypes.Edited,
      "",
      listedLicense.sellerId,
      listedLicense.licenseName,
      true
    );

    res.status(200).json({ msg: "Updated Successfully", success: true });
  } catch (e) {
    console.log("error in updating license", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};
//
const getLicenseForListedId = async (req, res) => {
  try {
    const { listedId } = req.params;
    const license = await ListedLicenses.findOne({
      listedId,
      $and: [listedLicenseQuery],
    });
    res.status(200).json({ msg: "Success", success: true, data: license });
  } catch (e) {
    console.log("error in getting license for listed id", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getNextOrPreviousLicense = async (req, res) => {
  try {
    const { listedId, isPrevious } = req.params;
    let curId = parseInt(listedId);
    let licenseData = null;

    // Define your listedLicenseQuery as required
    const listedLicenseQuery = {}; // Add your query conditions here

    while (!licenseData) {
      if (isPrevious === "true") {
        curId -= 1;
        if (curId <= 0) break; // Exit if no previous license is found
      } else {
        curId += 1;
      }

      licenseData = await ListedLicenses.findOne({
        listedId: curId,
        ...listedLicenseQuery,
      });

      if (!licenseData && isPrevious === "true" && curId <= 0) break; // Stop if no previous license is found and curId is invalid
    }

    if (licenseData) {
      res
        .status(200)
        .json({ msg: "Success", success: true, data: licenseData });
    } else {
      res.status(200).json({
        msg: "No more licenses available",
        success: false,
        data: null,
      });
    }
  } catch (e) {
    console.log("error in getting license for listed id", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};
const getListedLicensesByIds = async (req, res) => {
  try {
    const { listedIds } = req.body;

    // Ensure listedIds is an array and is not empty
    if (!Array.isArray(listedIds) || listedIds.length === 0) {
      return res.status(400).json({ msg: "Invalid input", success: false });
    }

    // Convert listedIds to numbers if they are not already
    const numericListedIds = listedIds.map((id) => Number(id));

    const listedLicenses = await ListedLicenses.aggregate([
      {
        $match: {
          listedId: { $in: numericListedIds },
        },
      },
      // Add more stages if needed, for example, to lookup related documents, project specific fields, etc.
    ]);

    res
      .status(200)
      .json({ msg: "Success", success: true, data: listedLicenses });
  } catch (e) {
    console.log("error in getting licenses for listed ids", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getPendingListings = async (req, res) => {
  try {
    const { sellerId, searchFilter } = req.body;
    const { keyword } = searchFilter;
    let licenses = await ListedLicenses.aggregate([
      {
        $match: {
          artists: {
            $elemMatch: {
              id: { $regex: sellerId, $options: "i" },
            },
          },
          licenseName: { $regex: new RegExp(keyword, "i") },
          ...pendingLicenseQuery,
        },
      },
      {
        $group: {
          _id: "$listedId",
          licenseName: { $first: "$licenseName" },
          albumName: { $first: "$albumName" },
          albumId: { $first: "$albumId" },
          sellerName: { $first: "$sellerName" },
          sellerAddress: { $first: "$sellerAddress" },
          sellerId: { $first: "$sellerId" },
          listedId: { $first: "$listedId" },
          tokenURI: { $first: "$tokenURI" },
          imagePath: { $first: "$imagePath" },
          avatarPath: { $first: "$avatarPath" },
          previewUrl: { $first: "$previewUrl" },
          artists: { $first: "$artists" },
          trackId: { $first: "$trackId" },
          length: { $first: "$length" },
          acousticness: { $first: "$acousticness" },
          danceability: { $first: "$danceability" },
          energy: { $first: "$energy" },
          instrumentalness: { $first: "$instrumentalness" },
          liveness: { $first: "$liveness" },
          mode: { $first: "$mode" },
          tempo: { $first: "$tempo" },
          genres: { $first: "$genres" },
          signingData: { $first: "$signingData" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: licenses });
  } catch (e) {
    console.log("error in getting in or outgoing licenses", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getTotalViewers = async (req, res) => {
  try {
    const { listedId } = req.body;
    const listedLicense = await ListedLicenses.findOne({ listedId });
    let totalViewers = listedLicense?.visitors?.length ?? 0;
    res.status(200).json({ msg: "success", success: true, data: totalViewers });
  } catch (e) {
    console.log("error in getting total viewers", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const addViewer = async (req, res) => {
  try {
    const { listedId } = req.body;
    let ip = getPublicIP(req);
    await ListedLicenses.findOneAndUpdate(
      { listedId },
      { $addToSet: { visitors: ip } }, // Add visitor to the visitors array if it doesn't exist
      { upsert: true, new: true } // Create the document if it doesn't exist, and return the updated document
    );
    res.status(200).json({ msg: "Added viewer", success: true });
  } catch (error) {
    console.error("Error adding viewer:", error);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getAdditionalInfo = async (req, res) => {
  try {
    const { listedId } = req.body;
    const listedLicense = await ListedLicenses.findOne({ listedId });
    const soldLicenses = await SoldLicenses.findOne({ listedId });
    const likers = await User.find({ favoritedLicenseIds: { $in: listedId } });

    let totalViewers = listedLicense?.visitors?.length ?? 0;
    let totalOwners = soldLicenses?.length ?? 0;
    let totalLikers = likers?.length ?? 0;
    res.status(200).json({
      msg: "Success",
      success: true,
      data: {
        totalViewers,
        totalOwners,
        totalLikers,
      },
    });
  } catch (e) {
    console.error("Error fetching additional info:", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getCartedLicenses = async (req, res) => {
  try {
    const { trackIds } = req.body;
    const licenses = await ListedLicenses.aggregate([
      {
        $match: {
          trackId: { $in: trackIds },
          $and: [listedLicenseQuery],
        },
      },
      {
        $project: {
          _id: 1,
          licenseName: 1,
          albumName: 1,
          sellerName: 1,
          sellerAddress: 1,
          sellerId: 1,
          listedId: 1,
          tokenURI: 1,
          imagePath: 1,
          avatarPath: 1,
          previewUrl: 1,
          artists: 1,
          trackId: 1,
          length: 1,
          acousticness: 1,
          danceability: 1,
          energy: 1,
          instrumentalness: 1,
          liveness: 1,
          mode: 1,
          tempo: 1,
          genres: 1,
          signingData: 1,
          createdAt: 1,
        },
      },
    ]);
    res.status(200).json({ success: true, msg: "success", data: licenses });
  } catch (e) {
    console.log("error in getting carted licenses", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getRecommendingLicenses = async (req, res) => {
  try {
    const { buyerAddress } = req.params;
    const buyer = await User.findOne({
      accountAddress: { $regex: buyerAddress, $options: "i" },
    });
    const licenses = await ListedLicenses.aggregate([
      {
        $match: {
          sellerId: { $in: buyer.followedAccounts },
          $and: [listedLicenseQuery],
        },
      },
      {
        $project: {
          _id: 1,
          licenseName: 1,
          albumName: 1,
          sellerName: 1,
          sellerAddress: 1,
          sellerId: 1,
          listedId: 1,
          tokenURI: 1,
          imagePath: 1,
          avatarPath: 1,
          previewUrl: 1,
          artists: 1,
          trackId: 1,
          length: 1,
          acousticness: 1,
          danceability: 1,
          energy: 1,
          instrumentalness: 1,
          liveness: 1,
          mode: 1,
          tempo: 1,
          genres: 1,
          signingData: 1,
          createdAt: 1,
        },
      },
    ]);
    res.status(200).json({ msg: "success", success: true, data: licenses });
  } catch (e) {
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

module.exports = {
  searchLicenses,
  getListedLicenseBySellerId,
  getAllUnLicensesBySellerId,
  checkduplication,
  getRecentUploads,
  getAllLicenses,
  approveLicense,
  unlistLicense,
  unlistLicenseAll,
  rejectLicense,
  uploadLicenseData,
  adjustLicense,
  getLicenseForListedId,
  getNextOrPreviousLicense,
  getListedLicensesByIds,
  getPendingListings,
  getTotalViewers,
  addViewer,
  getAdditionalInfo,
  getCartedLicenses,
  getRecommendingLicenses,
};
