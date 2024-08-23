const History = require("../model/history");
const { HistoryFilters, EventTypes } = require("../interface");

const searchPublicSalesDatabase = async (req, res) => {
  try {
    const { keyword, filterIndexes } = req.body;
    let query = [
      {
        $group: {
          _id: "$_id",
          listedId: { $first: "$listedId" },
          eventType: { $first: "$eventType" },
          price: { $first: "$price" },
          transactionHash: { $first: "$transactionHash" },
          createdAt: { $first: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "listedlicenses",
          localField: "listedId",
          foreignField: "listedId",
          as: "listedLicenses",
        },
      },
      {
        $match: {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
          ],
        },
      },
      { $sort: { createdAt: 1 } },
    ];

    let matchStage = query.find((stage) => stage.$match);

    if (filterIndexes.length === 0) {
      matchStage.$match = {
        $and: [
          {
            $or: [
              {
                "listedLicenses.licenseName": {
                  $regex: new RegExp(keyword, "i"),
                },
              },
              {
                "listedLicenses.sellerName": {
                  $regex: new RegExp(keyword, "i"),
                },
              },
            ],
          },
          {
            $or: [
              { eventType: EventTypes.CreatorSyncListing },
              { eventType: EventTypes.MediaSyncListing },
              { eventType: EventTypes.CreatorSyncReListing },
              { eventType: EventTypes.MediaSyncReListing },
              { eventType: EventTypes.CreatorSyncUnListing },
              { eventType: EventTypes.MediaSyncUnListing },
              { eventType: EventTypes.CreatorSyncChange },
              { eventType: EventTypes.MediaSyncChange },
              { eventType: EventTypes.CreatorSyncSale },
              { eventType: EventTypes.NonExclusiveSaleAccepted },
              { eventType: EventTypes.ExclusiveSaleAccepted },
              { eventType: EventTypes.CreatorSyncOfferAccepted },
              { eventType: EventTypes.NonExclusiveOfferAccepted },
              { eventType: EventTypes.ExclusiveOfferAccepted },
              { eventType: EventTypes.CreatorSyncGifting },
              { eventType: EventTypes.MediaSyncGifting },
            ],
          },
        ],
      };
    } else {
      if (filterIndexes.includes(HistoryFilters.Listed)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncListing },
                { eventType: EventTypes.MediaSyncListing },
              ],
            },
          ],
        };
      }

      if (filterIndexes.includes(HistoryFilters.ReListings)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncReListing },
                { eventType: EventTypes.MediaSyncReListing },
              ],
            },
          ],
        };
      }

      if (filterIndexes.includes(HistoryFilters.UnListings)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncUnListing },
                { eventType: EventTypes.MediaSyncUnListing },
              ],
            },
          ],
        };
      }

      if (filterIndexes.includes(HistoryFilters.Changes)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncChange },
                { eventType: EventTypes.MediaSyncChange },
              ],
            },
          ],
        };
      }

      if (filterIndexes.includes(HistoryFilters.Sales)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncSale },
                { eventType: EventTypes.NonExclusiveSaleAccepted },
                { eventType: EventTypes.ExclusiveSaleAccepted },
              ],
            },
          ],
        };
      }

      if (filterIndexes.includes(HistoryFilters.Offers)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncOfferAccepted },
                { eventType: EventTypes.NonExclusiveOfferAccepted },
                { eventType: EventTypes.ExclusiveOfferAccepted },
              ],
            },
          ],
        };
      }

      if (filterIndexes.includes(HistoryFilters.Gifting)) {
        const existingConditions =
          matchStage.$match.$and.length > 1
            ? matchStage.$match.$and[1].$or
            : [];
        matchStage.$match = {
          $and: [
            {
              $or: [
                {
                  "listedLicenses.licenseName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
                {
                  "listedLicenses.sellerName": {
                    $regex: new RegExp(keyword, "i"),
                  },
                },
              ],
            },
            {
              $or: [
                ...existingConditions,
                { eventType: EventTypes.CreatorSyncGifting },
                { eventType: EventTypes.MediaSyncGifting },
              ],
            },
          ],
        };
      }
    }
    const filteredHistories = await History.aggregate(query);
    res.status(200).json({ msg: "", success: true, data: filteredHistories });
  } catch (e) {
    console.log("error searching public sales database", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  searchPublicSalesDatabase,
};
