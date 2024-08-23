const { ListingStatusTypes, ReviewStatus } = require("../../interface");

const unlistedLicenseQuery = (sellerId) => {
  return [
    {
      $match: {
        sellerId: { $regex: sellerId, $options: "i" },
        $and: [
          {
            $or: [
              { "signingData.creator.listed": ListingStatusTypes.UnListed },
              { "signingData.creator.listed": ListingStatusTypes.NonListed },
            ],
          },
          {
            $or: [
              {
                "signingData.advertisement.listed": ListingStatusTypes.UnListed,
              },
              {
                "signingData.advertisement.listed":
                  ListingStatusTypes.NonListed,
              },
            ],
          },
          {
            $or: [
              { "signingData.movie.listed": ListingStatusTypes.UnListed },
              { "signingData.movie.listed": ListingStatusTypes.NonListed },
            ],
          },
          {
            $or: [
              { "signingData.videoGame.listed": ListingStatusTypes.UnListed },
              { "signingData.videoGame.listed": ListingStatusTypes.NonListed },
            ],
          },
          {
            $or: [
              { "signingData.tvSeries.listed": ListingStatusTypes.UnListed },
              { "signingData.tvSeries.listed": ListingStatusTypes.NonListed },
            ],
          },
          {
            $or: [
              { "signingData.aiTraining.listed": ListingStatusTypes.UnListed },
              { "signingData.aiTraining.listed": ListingStatusTypes.NonListed },
            ],
          },
        ],
      },
    },
    {
      $lookup: {
        from: "soldlicenses",
        localField: "listedId",
        foreignField: "listedId",
        as: "soldlicenses",
      },
    },
    {
      $match: {
        "soldlicenses.0": { $exists: true },
      },
    },
  ];
};

const creatorQuery = {
  $and: [
    {
      "signingData.creator.listed": ListingStatusTypes.Listed,
      "signingData.creator.revenues": {
        $not: { $elemMatch: { status: { $ne: ReviewStatus.Approved } } },
      },
      "signingData.creator.signature": { $exists: true },
    },
  ],
};

const movieQuery = {
  $and: [
    {
      "signingData.movie.listed": ListingStatusTypes.Listed,
      "signingData.movie.revenues": {
        $not: { $elemMatch: { status: { $ne: ReviewStatus.Approved } } },
      },
    },
  ],
};

const advertisementQuery = {
  $and: [
    {
      "signingData.advertisement.listed": ListingStatusTypes.Listed,
      "signingData.advertisement.revenues": {
        $not: { $elemMatch: { status: { $ne: ReviewStatus.Approved } } },
      },
    },
  ],
};

const tvSeriesQuery = {
  $and: [
    {
      "signingData.tvSeries.listed": ListingStatusTypes.Listed,
      "signingData.tvSeries.revenues": {
        $not: { $elemMatch: { status: { $ne: ReviewStatus.Approved } } },
      },
    },
  ],
};

const videoGameQuery = {
  $and: [
    {
      "signingData.videoGame.listed": ListingStatusTypes.Listed,
      "signingData.videoGame.revenues": {
        $not: { $elemMatch: { status: { $ne: ReviewStatus.Approved } } },
      },
    },
  ],
};

const aiTrainingQuery = {
  $and: [
    {
      "signingData.aiTraining.listed": ListingStatusTypes.Listed,
      "signingData.aiTraining.revenues": {
        $not: { $elemMatch: { status: { $ne: ReviewStatus.Approved } } },
      },
    },
  ],
};

const listedLicenseQuery = {
  $or: [
    creatorQuery,
    movieQuery,
    advertisementQuery,
    tvSeriesQuery,
    videoGameQuery,
    aiTrainingQuery,
  ],
};

const pendingLicenseQuery = {
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
};

module.exports = {
  listedLicenseQuery,
  unlistedLicenseQuery,
  pendingLicenseQuery,
};
