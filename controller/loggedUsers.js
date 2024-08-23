const LoggedUsers = require("../model/loggedUsers");
const io = require("../io").io();

const getSigninHistory = async (req, res) => {
  try {
    const { accountAddress } = req.params;
    const loggedUsers = await LoggedUsers.find({
      accountAddress: { $regex: accountAddress, $options: "i" },
    });
    res.status(200).json({ msg: "success", success: true, data: loggedUsers });
  } catch (e) {
    console.error("Error getting signin history:", e.message);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

const logoutHistory = async (req, res) => {
  try {
    const { loggedId } = req.params;
    await LoggedUsers.findByIdAndUpdate(loggedId, { status: false });
    io.emit("nitrility-signout", loggedId);
    res.status(200).json({ msg: "success", success: true });
  } catch (e) {
    console.error("Error getting signin history:", e.message);
    res.status(500).json({ msg: "Something went wrong", success: false });
  }
};

module.exports = {
  getSigninHistory,
  logoutHistory,
};
