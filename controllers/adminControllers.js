const asyncHandler = require("../middleware/asynchandler");
const User = require("../models/userModel");

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  console.log("started");
  const items_to_return = "_id name email number addresses";
  const users = await User.find().select(items_to_return);
  res.status(200).json({
    success: true,
    data: users,
  });
});
