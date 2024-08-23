const noUnlistedLicenseQuery = {};

const returnedListedLicenseQuery = {
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
};

module.exports = {
  noUnlistedLicenseQuery,
  returnedListedLicenseQuery,
};
