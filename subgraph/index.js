const axios = require("axios");
const { THEGRAPH_URL, IPFS_METADATA_API_URL } = require("../config");
const {
  createNotification,
  NotificationTypes,
} = require("../controller/notification");
const {
  acceptOffer,
  denyOffer,
  makeOffer,
  removeOffer,
} = require("../controller/notification");
const BlockNumber = require("../model/blockNumbers");
const Offers = require("../model/offers");
const User = require("../model/user");
const SoldLicenses = require("../model/soldLicenses");
const ListedLicenses = require("../model/listedLicenses");
const { createHistory } = require("../controller/history");
const {
  EventTypes,
  ListingStatusTypes,
  LicensingTypes,
  AccessLevels,
  ReviewStatus,
  OfferTypes,
} = require("../interface");
const { getSyncData } = require("../utils");

// Define the GraphQL subscription query for the events you want to listen for
const query = (blockNumber) => {
  return `
        query {
            offerEvents(
                where: {_change_block: {number_gte: ${blockNumber}}}
                orderBy: blockTimestamp
            ) {
              offerId
              accessLevel
              blockNumber
              blockTimestamp
              buyerAddr
              counts
              eventType
              id
              isSeller
              licensingType
              listedId
              offerDuration
              offerPrice
              tokenURI
              transactionHash
            }
            soldLicenseEvents(
              where: {_change_block: {number_gte: ${blockNumber}}}
              orderBy: blockNumber
            ) {
              accessLevel
              blockNumber
              transactionHash
              tokenURI
              tokenId
              price
              listedId
              licensingType
              id
              eventType
              counts
              buyerAddr
              blockTimestamp
            }
        }
    `;
};

const getOffers = async (offerEvents) => {
  for (const item of offerEvents) {
    try {
      let isSeller = item.isSeller;
      let isNew = false;
      let offerType;
      let offer = await Offers.findOne({
        offerId: Number(item.offerId),
      });

      if (offer) {
        if (
          offer.transactionHash.toLowerCase() ==
            item.transactionHash.toLowerCase() ||
          item.eventType == EventTypes.OfferPlaced
        ) {
          isNew = false;
        } else {
          if (
            offer.eventType == EventTypes.OfferExpired ||
            offer.eventType == EventTypes.OfferRejected ||
            offer.eventType == EventTypes.OfferWithdrawn
          ) {
            isNew = false;
          } else {
            isNew = true;
          }
        }
      } else {
        isNew = true;
      }

      const listedLicense = await ListedLicenses.findOne({
        listedId: item.listedId,
      });

      if (!listedLicense) {
        console.error(`No listed license found for listedId: ${item.listedId}`);
        continue;
      }

      const offerPrice = item.offerPrice / 10 ** 18;
      switch (item.eventType) {
        case EventTypes.OfferPlaced:
          if (!offer) {
            const syncData = getSyncData(listedLicense, item.licensingType);
            offer = await Offers.create({
              offerType: OfferTypes.GeneralOffer,
              offerId: Number(item.offerId),
              listedId: Number(item.listedId),
              sellerId: listedLicense.sellerId,
              buyerAddr: item.buyerAddr,
              offerPrice,
              offerDuration: item.offerDuration,
              tokenURI: item.tokenURI,
              eventType: Number(item.eventType),
              licensingType: Number(item.licensingType),
              accessLevel: Number(item.accessLevel),
              counts: Number(item.counts),
              signingData: syncData,
              transactionHash: item.transactionHash,
              buyerStatus: ReviewStatus.Approved,
              sellerStatus: ReviewStatus.Pending,
              createdAt: new Date().getTime(),
            });
            offerType = OfferTypes.GeneralOffer;
          }
          break;
        case EventTypes.OfferAccepted:
          if (offer && offer.eventType !== EventTypes.OfferAccepted) {
            offerType = offer.offerType;
            offer.eventType = EventTypes.OfferAccepted;
            offer.buyerStatus = ReviewStatus.Approved;
            offer.sellerStatus = ReviewStatus.Approved;
            offer.offerType = OfferTypes.NoneOffer;
            offer.transactionHash = item.transactionHash;

            await offer.save();
          }
          break;
        case EventTypes.OfferEdited:
        case EventTypes.OfferWithdrawn:
          if (isNew && offer) {
            offerType = offer.offerType;
            if (item.eventType === EventTypes.OfferEdited) {
              offer.preOffers = [
                ...offer.preOffers,
                {
                  offerPrice,
                  offerType,
                  offerDuration: offer.offerDuration,
                  tokenURI: offer.tokenURI,
                  signingData: offer.signingData,
                },
              ];
            } else {
              const lastOne = offer.preOffers.pop();
              offer.offerType = lastOne.offerType;
            }
            offer.offerPrice = offerPrice;
            offer.offerDuration = item.offerDuration;
            offer.tokenURI = item.tokenURI;
            offer.eventType = item.eventType;
            offer.sellerStatus = ReviewStatus.Pending;
            offer.buyerStatus = ReviewStatus.Approved;
            offer.transactionHash = item.transactionHash;

            offer.markModified("preOffers");
            await offer.save();
          }
          break;
        case EventTypes.OfferRejected:
          if (offer && offer.eventType !== EventTypes.OfferRejected) {
            offerType = offer.offerType;
            offer.eventType = EventTypes.OfferRejected;
            offer.offerType = OfferTypes.NoneOffer;
            offer.transactionHash = item.transactionHash;

            await offer.save();
          }
          break;
        default:
          break;
      }

      if (isNew && offer) {
        let otherArtists = [];
        listedLicense.artists.forEach((artist) => {
          otherArtists.push(artist.id);
        });
        const success = await createHistory(
          Number(item.eventType),
          Number(item.listedId),
          [Number(item.licensingType)],
          Number(item.offerId),
          offerPrice,
          Number(item.accessLevel),
          item.offerDuration,
          isSeller ? otherArtists : [item.buyerAddr],
          isSeller ? [item.buyerAddr] : otherArtists,
          offerType,
          Number(item.counts),
          item.transactionHash
        );

        if (success) {
          for (const artist of otherArtists) {
            try {
              await createNotification(
                Number(item.eventType),
                item.buyerAddr,
                artist,
                listedLicense.licenseName,
                isSeller,
                offerType,
                offerPrice
              );
            } catch (e) {
              console.error(
                `Failed to create notification for artist ${artist}:`,
                e
              );
            }
          }
        }
      }
    } catch (e) {
      console.log("Error in indexing offers", e);
    }
  }
};

const getSoldLicenses = async (soldLicenseEvents) => {
  await Promise.all(
    soldLicenseEvents.map(async (item) => {
      try {
        let block = await BlockNumber.findOne();
        const ownerInfo = await User.findOne({
          accountAddress: { $regex: item.buyerAddr, $options: "i" },
        });

        const eventType = Number(item.eventType);
        const licensingType = Number(item.licensingType);
        const accessLevel = Number(item.accessLevel);

        switch (eventType) {
          case EventTypes.Purchased:
          case EventTypes.OfferAccepted:
            let soldLicense = await SoldLicenses.findOne({
              tokenId: item.tokenId,
            });

            if (!soldLicense) {
              let listedLicense = await ListedLicenses.findOne({
                listedId: Number(item.listedId),
              });

              soldLicense = await SoldLicenses.create({
                tokenId: item.tokenId,
                listedId: item.listedId,
                sellerId: listedLicense.sellerId,
                sellerAddress: listedLicense.sellerAddress,
                eventType,
                licensingType,
                accessLevel,
                counts: item.counts,
                buyerAddress: item.buyerAddr,
                tokenURI: item.tokenURI,
                price: (item.counts * item.price) / 10 ** 18,
                ownerInfo: ownerInfo?.buyerAccountData,
                isBurned: false,
                transactionHash: item.transactionHash,
                createdAt: new Date().getTime(),
              });

              let syncData;
              switch (licensingType) {
                case LicensingTypes.Creator:
                  syncData = listedLicense.signingData.creator;
                  break;
                case LicensingTypes.Movie:
                  syncData = listedLicense.signingData.movie;
                  break;
                case LicensingTypes.Advertisement:
                  syncData = listedLicense.signingData.advertisement;
                  break;
                case LicensingTypes.VideoGame:
                  syncData = listedLicense.signingData.videoGame;
                  break;
                case LicensingTypes.TvSeries:
                  syncData = listedLicense.signingData.tvSeries;
                  break;
                case LicensingTypes.AiTraining:
                  syncData = listedLicense.signingData.aiTraining;
                  break;
                default:
                  break;
              }
              listedLicense.markModified("signingData");

              if (!syncData.infiniteSupply) {
                syncData = {
                  ...syncData,
                  totalSupply: syncData.totalSupply - 1,
                };
              }

              if (accessLevel === AccessLevels.Exclusive) {
                syncData = {
                  ...syncData,
                  listed: ListingStatusTypes.Exclusived,
                };
              }

              await listedLicense.save();

              if (eventType !== EventTypes.OfferAccepted) {
                const success = await createHistory(
                  eventType,
                  listedLicense.listedId,
                  [licensingType],
                  soldLicense.tokenId,
                  item.price / 10 ** 18,
                  accessLevel,
                  null,
                  [item.buyerAddr],
                  [listedLicense.sellerId],
                  OfferTypes.offerType,
                  Number(item.counts),
                  item.transactionHash
                );

                if (success) {
                  await createNotification(
                    eventType,
                    soldLicense.buyerAddress,
                    listedLicense.sellerId,
                    listedLicense.licenseName,
                    false,
                    OfferTypes.NoneOffer,
                    item.price / 10 ** 18
                  );
                }
              }
            }
            break;
          default:
            break;
        }

        if (block.number < item.blockNumber) {
          block.number = item.blockNumber;
          await block.save();
        }
      } catch (e) {
        console.log("Error in mapping sold licenses", e);
      }
    })
  );
};

const getEvents = async () => {
  try {
    let block = await BlockNumber.findOne();
    const res = await axios({
      url: THEGRAPH_URL,
      method: "post",
      data: { query: query(block.number) },
    });
    if (res.status === 200) {
      const offerEvents = res.data.data.offerEvents;
      const soldLicenseEvents = res.data.data.soldLicenseEvents;
      await getOffers(offerEvents);
      await getSoldLicenses(soldLicenseEvents);
    } else {
      console.log("error in getting events from thegraph", e);
    }
  } catch (e) {
    // console.log("error in getting events", e);
  }
};

// Subscribe to the "tradeExecuted" event using the subscription query
let isGettingEvents = false;

const startIndexing = async () => {
  while (true) {
    try {
      if (!isGettingEvents) {
        isGettingEvents = true;
        await getEvents();
        isGettingEvents = false;
      }
    } catch (e) {
      console.log("error in indexing subgraph", e);
    }
  }
};

module.exports = {
  startIndexing,
};
