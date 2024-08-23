exports.ListingStatusTypes = {
  NonListed: 0,
  Listed: 1,
  UnListed: 2,
  Expired: 3,
  Exclusived: 4,
};

exports.AccessLevels = {
  NonExclusive: 0,
  Exclusive: 1,
  Both: 2,
  None: 3,
};

exports.OfferTypes = {
  GeneralOffer: 0,
  CounterOffer: 1,
  NoneOffer: 2,
};

exports.EventTypes = {
  Purchased: 0,
  OfferPlaced: 1,
  OfferAccepted: 2,
  OfferRejected: 3,
  OfferWithdrawn: 4,
  OfferEdited: 5,
  OfferExpired: 6,
  Listed: 7,
  PendingListed: 8,
  Edited: 9,
  SongUnlisted: 10,
  LicenseTypeUnlisted: 11,
  CollaboratorAccepted: 12,
  CollaboratorRejected: 13,
};

exports.LicensingTypes = {
  Creator: 0,
  Advertisement: 1,
  TvSeries: 2,
  Movie: 3,
  VideoGame: 4,
  AiTraining: 5,
  All: 6,
};

exports.SortOptions = {
  Newest: "Date: Newest",
  Oldest: "Date: Oldest",
};

exports.AvailabilityOptions = {
  All: "Availability",
  Creator: "Creator",
  Movie: "Movie",
  Advertisment: "Advertisment",
  VideoGame: "Video Game",
  TvSeries: "Tv Show",
  AiTraining: "Ai Training",
};

exports.IdenfyReview = {
  None: -1,
  Pending: 0,
  Business: 1,
  NoBusiness: 2,
  Deleted: 3,
};

exports.AmlReviewTypes = {
  Company: "COMPANY",
  Beneficiary: "BENEFICIARY",
  Shareholder: "SHAREHOLDER",
};

exports.AutoReviewTypes = {
  Approved: "APPROVED",
  Denied: "DENIED",
};

exports.Activities = {
  Listings: "Listings",
  Collaborations: "Collaborations",
  Sales: "Sales",
  Offers: "Offers",
};

exports.PlatformTypes = {
  personal: "Personal",
  spotify: "Spotify",
  uspto: "USPTO",
  apple: "Apple Music",
  cruncyroll: "CruncyRoll",
};

exports.ReviewStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Deleted: 3,
};

exports.UserRoles = {
  Buyer: 0,
  Seller: 1,
};

exports.SocialAccountType = {
  Youtube: "YouTube",
  TikTok: "TikTok",
  Facebook: "Facebook",
  Instagram: "Instagram",
  Twitch: "Twitch",
  TwitterX: "Twitter / X",
  WebSite: "Website",
  Spotify: "Spotify",
};

exports.INFINITE = "Infinite";
