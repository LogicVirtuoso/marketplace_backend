const LicenseChanges = require("../model/licenseChanges");
const ListedLicenses = require("../model/listedLicenses");

const getChangedLicenseData = async (req, res) => {
  try {
    const { historyId } = req.params;
    const changeData = await LicenseChanges.findOne({ historyId }).lean();
    const license = await ListedLicenses.findOne({
      listedId: changeData.listedId,
    });
    let data = {
      ...changeData,
      imagePath: license.imagePath,
      avatarPath: license.avatarPath,
      licenseName: license.licenseName,
      sellerName: license.sellerName,
      sellerId: license.sellerId,
    };
    res.status(200).json({ msg: "Success", success: true, data });
  } catch (e) {
    console.log("error in getting license changes", e);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  getChangedLicenseData,
};
