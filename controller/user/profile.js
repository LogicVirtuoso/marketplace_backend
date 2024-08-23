const PublicProfile = require("../../model/publicProfile");
const User = require("../../model/user");
const SoldLicenses = require("../../model/soldLicenses");
const ListedLicenses = require("../../model/listedLicenses");
const Offers = require("../../model/offers");
const SellerData = require("../../model/sellerData");
const {
  PlatformTypes,
  ListingStatusTypes,
  ReviewStatus,
  EventTypes,
  OfferTypes,
  UserRoles,
  SocialAccountType,
} = require("../../interface");
const Idenfy = require("../../model/idenfy");
const { BUYER_IDX } = require("../../config");
const { generateJwtToken, getPublicIP } = require("../../utils");
const {
  unlistedLicenseQuery,
  listedLicenseQuery,
} = require("../listedLicenses/queries");
const resMsg = {
  error: "something went wrong",
  notExisted: "This artist does not have public profile",
  gettingSuccess: "read successfully",
  savingSuccess: "saved successfully",
  update: "updated successfully",
  sentEmail: "sent the verification code successfully",
  locked: "could not publish the profile",
};

const createInitialPublicProfile = async (sellerId) => {
  try {
    const publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });
    const sellerData = await SellerData.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });
    if (publicProfile) {
      return true;
    } else {
      await PublicProfile.create({
        sellerId,
        sellerName: sellerData.sellerName,
        collections: [],
        contacts: {
          email: "",
          phone: "",
        },
        socials: {
          [SocialAccountType.WebSite]: "",
          [SocialAccountType.Instagram]: "",
          [SocialAccountType.Youtube]: "",
          [SocialAccountType.TikTok]: "",
          [SocialAccountType.TwitterX]: "",
          [SocialAccountType.Twitch]: "",
          [SocialAccountType.Spotify]: `https://open.spotify.com/artist/${sellerId}`,
        },
        bio: "",
        visitors: [],
      });
    }
  } catch (e) {
    console.log("error in creating initial public profile page", e);
    return false;
  }
};

const savePublicProfile = async (req, res) => {
  const {
    sellerId,
    description,
    collectionName,
    selectedLicenses,
    imagePath,
    collectionId,
  } = req.body;
  try {
    let publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    if (publicProfile) {
      let collection = publicProfile.collections.find(
        (item) => item.collectionId == collectionId
      );
      if (collection) {
        collection.description = description;
        collection.collectionName = collectionName;
        collection.selectedLicenses = selectedLicenses;
        collection.imagePath = imagePath;
        collection.collectionId = collectionId;
        collection.createdAt = Date.now();
        collection.published = true;

        await publicProfile.save();
        res.status(200).json({
          msg: "Updated Successfully",
          success: true,
          data: publicProfile.collections,
        });
      } else {
        publicProfile.collections.push({
          description,
          collectionName,
          selectedLicenses,
          imagePath,
          collectionId,
          createdAt: Date.now(),
          published: true,
        });
        publicProfile = await publicProfile.save();
        res.status(200).json({
          msg: "Saved Successfully",
          success: true,
          data: publicProfile.collections,
        });
      }
    } else {
      publicProfile = await PublicProfile.create({
        sellerId,
        collections: [
          {
            description,
            collectionName,
            selectedLicenses,
            imagePath,
            collectionId,
            createdAt: Date.now(),
            published: true,
          },
        ],
      });
      res.status(200).json({
        msg: "Saved Successfully",
        success: true,
        data: publicProfile.collections,
      });
    }
  } catch (e) {
    console.log("error in saving public profile page", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const updatePublicProfile = async (req, res) => {
  const {
    sellerId,
    description,
    collectionName,
    selectedLicenses,
    imagePath,
    collectionId,
  } = req.body;
  try {
    let publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    if (publicProfile) {
      let collection = publicProfile.collections.find(
        (item) => item.collectionId == collectionId
      );
      if (collection) {
        collection.description = description;
        collection.collectionName = collectionName;
        collection.selectedLicenses = selectedLicenses;
        collection.imagePath = imagePath;
        collection.collectionId = collectionId;
        collection.createdAt = Date.now();
        publicProfile.markModified("collections");

        const licenses = await ListedLicenses.find({
          listedId: { $in: selectedLicenses },
        });

        await publicProfile.save();
        res.status(200).json({
          msg: "Updated Successfully",
          success: true,
          data: {
            collection,
            licenses,
          },
        });
      } else {
        res.status(200).json({
          msg: "There is no this collection",
          success: false,
        });
      }
    } else {
      res.status(200).json({
        msg: "There is no this collection",
        success: false,
      });
    }
  } catch (e) {
    console.log("error in saving public profile page", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const deleteCollection = async (req, res) => {
  try {
    const { collectionId, sellerId } = req.params;
    let publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    if (publicProfile) {
      const collectionIndex = publicProfile.collections.findIndex(
        (item) => item.collectionId == collectionId
      );
      // Check if the collection was found
      if (collectionIndex !== -1) {
        // Remove the collection from the array
        publicProfile.collections.splice(collectionIndex, 1);

        // Save the updated document
        publicProfile.markModified("collections");
        await publicProfile.save();

        res.status(200).json({
          msg: "Collection deleted successfully",
          success: true,
        });
      } else {
        res.status(404).json({
          msg: "Collection not found",
          success: false,
        });
      }
    } else {
      res.status(200).json({
        msg: "There is no this collection",
        success: false,
      });
    }
  } catch (e) {
    console.log("error in saving public profile page", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const removeCollection = async (req, res) => {
  try {
    const { collectionId, sellerId } = req.params;
    let publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    if (publicProfile) {
      const collection = publicProfile.collections.find(
        (item) => item.collectionId == collectionId
      );
      // Check if the collection was found
      if (collection) {
        // Remove the collection from the array
        collection.published = false;

        // Save the updated document
        publicProfile.markModified("collections");
        await publicProfile.save();

        res.status(200).json({
          msg: "Collection removed successfully",
          success: true,
        });
      } else {
        res.status(404).json({
          msg: "Collection not found",
          success: false,
        });
      }
    } else {
      res.status(200).json({
        msg: "There is no this collection",
        success: false,
      });
    }
  } catch (e) {
    console.log("error in saving public profile page", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const getPublicProfile = async (req, res) => {
  const { sellerId } = req.params;
  try {
    const publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });

    if (publicProfile) {
      res.status(200).json({
        msg: resMsg.gettingSuccess,
        success: true,
        data: publicProfile,
      });
    } else {
      res.status(200).json({ msg: resMsg.notExisted, success: false });
    }
  } catch (e) {
    console.log("get profile error", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const getSellerData = async (req, res) => {
  const { sellerId } = req.params;
  try {
    let sellerData = await SellerData.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    }).lean();
    if (sellerData) {
      let listings = 0;
      const listedLicenses = await ListedLicenses.find({
        sellerId: sellerData.sellerId,
      });
      listings = listedLicenses.length;

      const followers = await User.aggregate([
        {
          $match: {
            followedAccounts: {
              $elemMatch: { $regex: sellerData.sellerId, $options: "i" },
            },
          },
        },
        {
          $project: {
            _id: 1,
            accountAddress: 1,
            firstName: 1,
            lastName: 1,
          },
        },
      ]);

      res.status(200).json({
        msg: resMsg.gettingSuccess,
        success: true,
        data: {
          ...sellerData,
          listings,
          followers,
        },
      });
    } else {
      res.status(200).json({ msg: resMsg.notExisted, success: false });
    }
  } catch (e) {
    console.log("get profile error", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const updateSellerProfile = async (req, res) => {
  try {
    const { sellerId, publicProfileData } = req.body;
    const { bio, contacts, socials, collections } = publicProfileData;

    const filter = {
      sellerId: { $regex: sellerId, $options: "i" },
    };
    const update = {
      bio,
      contacts,
      socials,
      collections,
    };

    const current = await PublicProfile.findOne(filter);
    if (current) {
      const updatedProfile = await PublicProfile.findOneAndUpdate(
        filter,
        update
      );
      res.status(200).json({
        msg: "Saved your changes",
        success: true,
        data: updatedProfile,
      });
    } else {
      const newProfile = await PublicProfile.create({
        ...update,
        sellerId,
      });
      res.status(200).json({
        msg: "Saved your changes",
        success: true,
        data: newProfile,
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const getCollectionData = async (req, res) => {
  try {
    const { sellerId, collectionId } = req.params;
    let publicProfile = await PublicProfile.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });
    if (publicProfile?.collections) {
      let collection = publicProfile.collections.find(
        (item) => item.collectionId == collectionId
      );
      let sellerData = await SellerData.findOne({ sellerId: sellerId });
      const licenses = await ListedLicenses.find({
        listedId: { $in: collection.selectedLicenses },
      });
      res.status(200).json({
        msg: resMsg.gettingSuccess,
        success: true,
        data: { collection, sellerName: sellerData.sellerName, licenses },
      });
    } else {
      res.status(200).json({ msg: resMsg.notExisted, success: false });
    }
  } catch (e) {
    console.log("get collection error", e);
    res.status(500).json({ msg: resMsg.error, success: false });
  }
};

const updateBuyerPlatform = async (req, res) => {
  try {
    const { accountAddress, buyerAccountData } = req.body;
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    user.buyerAccountData = buyerAccountData;
    user.markModified("buyerAccountData");
    await user.save();

    await SoldLicenses.updateMany(
      {
        buyerAddress: { $regex: accountAddress, $options: "i" },
      },
      {
        ownerInfo: buyerAccountData,
      }
    );
    res.status(200).json({ msg: "updated successfully", success: true });
  } catch (e) {
    console.log("error in updating buyerplatform", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const updateAddressHandler = async (req, res) => {
  try {
    const { accountAddress, address } = req.body;
    const user = await User.findOneAndUpdate(
      { accountAddress: { $regex: accountAddress, $options: "i" } },
      { address }
    );
    const token = await generateJwtToken(user);
    res.status(200).json({
      msg: "updated successfully",
      success: true,
      data: { accessToken: token },
    });
  } catch (e) {
    console.log("error in updating buyerplatform", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const updateSellerPlatform = async (req, res) => {
  try {
    const { accountAddress, sellerAccountData } = req.body;
    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    user.sellerAccountData = sellerAccountData;
    user.markModified("sellerAccountData");
    await user.save();
    res.status(200).json({ msg: "updated successfully", success: true });
  } catch (e) {
    console.log("error in updating buyerplatform", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getBuyerPlatform = async (req, res) => {
  try {
    const { accountAddress } = req.params;
    const user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    const companyInfo = await Idenfy.findOne({
      clientId: { $regex: accountAddress + BUYER_IDX, $options: "i" },
    });
    res.status(200).json({
      msg: "success",
      success: true,
      data: {
        name: user.firstName + user.lastName,
        buyerData: user.buyerAccountData,
        email: user.email,
        companyInfo,
      },
    });
  } catch (e) {
    console.log("error in getting buyerplatform", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getSellerPlatform = async (req, res) => {
  try {
    const { accountAddress } = req.params;
    let user = await User.findOne({
      accountAddress: {
        $regex: accountAddress,
        $options: "i",
      },
    });
    if (user) {
      const sellerPlatforms = await Promise.all(
        user?.sellerAccountData?.map(async (item) => {
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
      res
        .status(200)
        .json({ msg: "success", success: true, data: sellerPlatforms });
    } else {
      res.status(200).json({ msg: "success", success: true, data: [] });
    }
  } catch (e) {
    console.log("error in getting sellerPlatform", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getCurrentAccount = async (req, res) => {
  try {
    const { accountAddress, platformTitle } = req.body;
    let accounts = [],
      current;
    const user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    }).lean();
    let account = user.sellerAccountData.find(
      (item) => item.platformTitle === platformTitle
    );

    if (account?.associatedEmail) {
      current = account.associatedEmail;
      const tmp = await User.find({
        sellerAccountData: {
          $elemMatch: { associatedEmail: current },
        },
      }).select("accountAddress");
      accounts.push({ account: current, accounts: tmp });
    } else {
      account = user.buyerAccountData.find(
        (item) => item.platformTitle === platformTitle
      );
      if (account) {
        current = account.accounts;
        await Promise.all(
          current.map(async (item) => {
            const tmp = await User.find({
              "buyerAccountData.accounts": item,
            }).select("accountAddress");
            if (tmp) {
              accounts.push({ account: item, accounts: tmp });
            }
          })
        );
      } else {
        res
          .status(200)
          .json({ msg: "there is no duplicated data", success: false });
        return;
      }
    }
    res.status(200).json({
      msg: "success",
      success: true,
      data: accounts,
    });
  } catch (e) {
    console.log("error in getting buyerplatform", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const getPrivateProfileData = async (req, res) => {
  try {
    const { accountAddress } = req.params;
    const user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });

    if (!user) {
      return res.status(200).json({ msg: "User not found", success: false });
    }

    let listings = 0;
    let owned = 0;
    let sold = 0;
    let offerReceived = 0;
    let offerMade = 0;
    let pendingListings = 0;
    let unlistedListings = 0;
    let sellerAccountData;
    let followers = [];
    if (user.role !== UserRoles.Buyer) {
      sellerAccountData = user.sellerAccountData.find(
        (item) => item.platformTitle === PlatformTypes.spotify
      );
      if (sellerAccountData) {
        const listedLicenses = await ListedLicenses.find({
          sellerId: sellerAccountData.sellerId,
          ...listedLicenseQuery,
        });
        listings = listedLicenses.length;
        const soldLicenses = await SoldLicenses.find({
          sellerId: { $regex: sellerAccountData.sellerId, $options: "i" },
        });
        sold = soldLicenses.length;
        const unlists = await ListedLicenses.aggregate(
          unlistedLicenseQuery(sellerAccountData.sellerId)
        );
        unlistedListings = unlists.length;

        const pending = await ListedLicenses.find({
          artists: {
            $elemMatch: {
              id: { $regex: sellerAccountData.sellerId, $options: "i" },
            },
          },
          $or: [
            {
              "signingData.creator.revenues": {
                $elemMatch: { status: { $ne: ReviewStatus.Approved } },
              },
              "signingData.creator.listed": {
                $ne: ListingStatusTypes.UnListed,
              },
            },
            {
              "signingData.movie.revenues": {
                $elemMatch: { status: { $ne: ReviewStatus.Approved } },
              },
              "signingData.movie.listed": {
                $ne: ListingStatusTypes.UnListed,
              },
            },
            {
              "signingData.advertisement.revenues": {
                $elemMatch: { status: { $ne: ReviewStatus.Approved } },
              },
              "signingData.advertisement.listed": {
                $ne: ListingStatusTypes.UnListed,
              },
            },
            {
              "signingData.videoGame.revenues": {
                $elemMatch: { status: { $ne: ReviewStatus.Approved } },
              },
              "signingData.videoGame.listed": {
                $ne: ListingStatusTypes.UnListed,
              },
            },
            {
              "signingData.tvSeries.revenues": {
                $elemMatch: { status: { $ne: ReviewStatus.Approved } },
              },
              "signingData.tvSeries.listed": {
                $ne: ListingStatusTypes.UnListed,
              },
            },
            {
              "signingData.aiTraining.revenues": {
                $elemMatch: { status: { $ne: ReviewStatus.Approved } },
              },
              "signingData.aiTraining.listed": {
                $ne: ListingStatusTypes.UnListed,
              },
            },
          ],
        });
        pendingListings = pending.length;

        const made = await Offers.find({
          $or: [
            {
              buyerAddr: { $regex: accountAddress, $options: "i" },
              offerType: OfferTypes.GeneralOffer,
            },
            {
              sellerId: { $regex: sellerAccountData.sellerId, $options: "i" },
              offerType: OfferTypes.CounterOffer,
              buyerStatus: { $ne: ReviewStatus.Approved },
            },
          ],
        });
        offerMade = made.length;

        const received = await Offers.aggregate([
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
              signingData: 1,
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
                    $regex: sellerAccountData?.sellerId,
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
        offerReceived = received.length;

        followers = await User.aggregate([
          {
            $match: {
              followedAccounts: {
                $elemMatch: {
                  $regex: sellerAccountData?.sellerId,
                  $options: "i",
                },
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
      }
    } else {
      const made = await Offers.find({
        buyerAddr: { $regex: accountAddress, $options: "i" },
        offerType: OfferTypes.GeneralOffer,
      });
      offerMade = made.length;

      const received = await Offers.find({
        eventType: EventTypes.OfferPlaced,
        offerType: OfferTypes.CounterOffer,
        buyerAddr: { $regex: accountAddress, $options: "i" },
      });
      offerReceived = received.length;
    }

    let ownedLicenses = await SoldLicenses.find({
      buyerAddress: { $regex: accountAddress, $options: "i" },
    });
    owned = ownedLicenses.length;

    const following = await SellerData.aggregate([
      {
        $match: {
          sellerId: { $in: user.followedAccounts },
        },
      },
      {
        $project: {
          _id: 1,
          sellerId: 1,
          userName: "$sellerName",
          avatarPath: 1,
        },
      },
    ]);

    const data = {
      timeOfCreation: user.timeOfCreation,
      listings,
      owned,
      sold,
      pendingListings,
      unlistedListings,
      offerMade,
      offerReceived,
      followers,
      following,
      displayName: user?.firstName + " " + user?.lastName ?? "",
    };
    res.status(200).json({ msg: "success", success: true, data });
  } catch (error) {
    console.log("Error in getting private profile:", error);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

// returns social accounts of the public site
const getSocialAccounts = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const publicProfile = await PublicProfile.findOne({ sellerId });
    res
      .status(200)
      .json({ msg: "success", success: true, data: publicProfile.socials });
  } catch (e) {
    console.log("error in getting social accounts", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const addProfileViewer = async (req, res) => {
  try {
    const { sellerId } = req.body;
    let ip = getPublicIP(req);
    await PublicProfile.findOneAndUpdate(
      { sellerId: { $regex: sellerId, $options: "i" } },
      { $addToSet: { visitors: ip } }, // Add visitor to the visitors array if it doesn't exist
      { upsert: true, new: true } // Create the document if it doesn't exist, and return the updated document
    );
    res.status(200).json({ msg: "Added viewer", success: true });
  } catch (error) {
    console.error("Error adding viewer:", error);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  createInitialPublicProfile,
  savePublicProfile,
  updatePublicProfile,
  deleteCollection,
  removeCollection,
  getPublicProfile,
  updateBuyerPlatform,
  updateAddressHandler,
  updateSellerPlatform,
  getBuyerPlatform,
  getSellerPlatform,
  getCurrentAccount,
  getPrivateProfileData,
  getCollectionData,
  getSellerData,
  updateSellerProfile,
  getSocialAccounts,
  addProfileViewer,
};
