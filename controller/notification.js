const Notification = require("../model/notification");
const User = require("../model/user");
const ListedLicenses = require("../model/listedLicenses");
const { OfferTypes, EventTypes } = require("../interface");
const SellerData = require("../model/sellerData");
const io = require("../io").io();

const getNotifications = async (req, res) => {
  try {
    const { accountAddress, sellerId } = req.body;
    let notifications;
    notifications = await Notification.find({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });

    let user = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    let socialNotifications = [];
    if (user) {
      let buyerData = user.buyerAccountData;
      await Promise.all(
        buyerData.map(async (item) => {
          await Promise.all(
            item?.accounts?.map(async (account) => {
              let report = await Notification.find({
                userId: { $regex: account, $options: "i" },
                socialMediaName: { $regex: item.platformTitle, $options: "i" },
              });
              if (report) {
                socialNotifications = [].concat(socialNotifications, report);
              }
            })
          );
        })
      );
    }
    notifications = [].concat(notifications, socialNotifications);

    if (sellerId) {
      licenseChangeNotification = await Notification.find({ sellerId });
      notifications = [].concat(notifications, licenseChangeNotification);
    }

    res
      .status(200)
      .json({ msg: "success", success: true, data: notifications });
  } catch (e) {
    console.log("error searching the notification", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const createNotification = async (
  eventType,
  accountAddress,
  sellerId,
  licenseName,
  isSeller,
  offerType = OfferTypes.NoneOffer,
  price = null
) => {
  try {
    let buyer = await User.findOne({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });

    const userName = buyer?.firstName + " " + buyer?.lastName;
    let seller = await SellerData.findOne({
      sellerId: { $regex: sellerId, $options: "i" },
    });
    let desForSeller, desForBuyer;
    const offerName =
      offerType === OfferTypes.GeneralOffer ? "offer" : "counter offer";
    const createDescription = (
      action,
      isSeller,
      userName,
      sellerName,
      licenseName
    ) => {
      const commonDescription = `${action} ${offerName} on <span style="font-weight: 600;">${licenseName}</span>`;
      if (isSeller) {
        return {
          desForSeller: `You ${commonDescription}`,
          desForBuyer: `<span style="font-weight: 600;">${sellerName}</span> ${commonDescription}`,
        };
      } else {
        return {
          desForSeller: `<span style="font-weight: 600;">${userName}</span> ${commonDescription}`,
          desForBuyer: `You ${commonDescription}`,
        };
      }
    };
    switch (eventType) {
      case EventTypes.Purchased:
        desForSeller = `<span style="font-weight: 600;">${userName}</span> purchased a creator license for <span style="font-weight: 600;">${licenseName}</span> for $${price}`;
        desForBuyer = `You purchased a creator license for <span style="font-weight: 600;">${licenseName}</span> for $${price}`;
        break;
      case EventTypes.OfferPlaced:
        desForSeller = `<span style="font-weight: 600;">${userName}</span> placed ${offerName} on <span style="font-weight: 600;">${licenseName}</span>`;
        desForBuyer = `You placed ${offerName} on <span style="font-weight: 600;">${licenseName}</span>`;
        break;
      case EventTypes.OfferAccepted:
        ({ desForSeller, desForBuyer } = createDescription(
          "accepted",
          isSeller,
          userName,
          seller.sellerName,
          licenseName
        ));
        break;
      case EventTypes.OfferRejected:
        ({ desForSeller, desForBuyer } = createDescription(
          "rejected",
          isSeller,
          userName,
          seller.sellerName,
          licenseName
        ));
        break;
      case EventTypes.OfferWithdrawn:
        ({ desForSeller, desForBuyer } = createDescription(
          "has withdrawn",
          isSeller,
          userName,
          seller.sellerName,
          licenseName
        ));
        break;
      case EventTypes.OfferEdited:
        ({ desForSeller, desForBuyer } = createDescription(
          "edited",
          isSeller,
          userName,
          seller.sellerName,
          licenseName
        ));
        break;
      case EventTypes.OfferExpired:
        desForBuyer = `${offerName} on <span style="font-weight: 600;">${licenseName}</span> has expired`;
        desForSeller = `${offerName} on <span style="font-weight: 600;">${licenseName}</span> has expired`;
        break;
      case EventTypes.Listed:
        desForSeller = `Your license <span style="font-weight: 600;">${licenseName}</span> has been successfully listed`;
        break;
      case EventTypes.Edited:
        desForSeller = `You have edited the listing <span style="font-weight: 600;">${licenseName}</span>`;
        break;
      case EventTypes.SongUnlisted:
        desForSeller = `You have unlisted <span style="font-weight: 600;">${licenseName}</span>`;
        break;
      case EventTypes.LicenseTypeUnlisted:
        desForSeller = `You have unlisted a license from <span style="font-weight: 600;">${licenseName}</span>`;
        break;
      default:
        return false;
    }

    if (
      eventType == EventTypes.Purchased ||
      eventType == EventTypes.OfferPlaced ||
      eventType == EventTypes.OfferAccepted ||
      eventType == EventTypes.OfferEdited ||
      eventType == EventTypes.OfferExpired ||
      eventType == EventTypes.OfferRejected ||
      eventType == EventTypes.OfferWithdrawn
    ) {
      notification = await Notification.create({
        eventType,
        reader: sellerId,
        description: desForSeller,
      });
      io.emit("nitrility-notification", notification);

      notification = await Notification.create({
        eventType,
        reader: accountAddress,
        description: desForBuyer,
      });
      io.emit("nitrility-notification", notification);
    } else {
      notification = await Notification.create({
        eventType,
        reader: sellerId,
        description: desForSeller,
      });
      io.emit("nitrility-notification", notification);
    }
    return true;
  } catch (e) {
    console.log("error in notification: ", e);
    return false;
  }
};

const markAsReadNotification = async (req, res) => {
  try {
    const { id } = req.body;
    await Notification.findByIdAndUpdate(id, { $set: { read: true } });
    res.status(200).json({ msg: "success", success: true });
  } catch (e) {
    console.log(`error in updating ${id} notification`, e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

const markAllAsReadNotification = async (req, res) => {
  try {
    const { accountAddress, sellerName } = req.body;
    await Notification.updateMany(
      { accountAddress },
      {
        $set: {
          read: true,
        },
      }
    );
    await Notification.updateMany(
      { sellerName },
      {
        $set: {
          read: true,
        },
      }
    );
    res.status(200).json({ msg: "success", success: true });
  } catch (e) {
    console.log("error in updating notificatons", e);
    res.status(500).json({ msg: "something went wrong", success: false });
  }
};

module.exports = {
  getNotifications,
  createNotification,
  markAsReadNotification,
  markAllAsReadNotification,
};
