const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const sendJwt = require("../utils/jwttokenSend");
const mongoose = require("mongoose");
const sendEmail = require("../utils/sendEmail");
const moment = require("moment");
const fs = require("fs");
//

// user register
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, number, address } = req.body;
  let user = await User.findOne({ email });
  let userno = await User.findOne({ number });
  if (user) {
    return next(new errorHandler("Email already exist", 401));
  }
  if (userno) {
    return next(new errorHandler("Number already exist", 401));
  }
  user = await User.create({
    name,
    email,
    password,
    number,
  });
  sendJwt(user, 201, "registerd successfully", res);
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, number, password, name } = req.body;
  if ((!email && !number && !name) || !password) {
    return next(new errorHandler("Enter Email/Number/Name and Password", 403));
  }

  let user;

  if (email) {
    user = await User.findOne({ email }).select("+password");
  } else if (number) {
    user = await User.findOne({ number }).select("+password");
  } else if (name) {
    user = await User.findOne({ name }).select("+password");
  }

  if (!user) {
    return next(new errorHandler("Invalid Email/Number/Name or Password", 403));
  }

  const passwordMatch = await user.comparePassword(password);

  if (!passwordMatch) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  sendJwt(user, 200, "Login successful", res);
});

// forgot password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }
  const token = user.resetToken();
  const resetUrl = `https://oneappusers.netlify.app/resetpassword/${token}`;
  const message = `your reset url is ${resetUrl} leave it if you didnt requested for it`;
  await user.save({ validateBeforeSave: false });
  try {
    const mailMessage = await sendEmail({
      email: user.email,
      subject: "password reset mail",
      message: message,
    });
    res.status(201).json({
      success: true,
      message: "mail sent successfully",
      mailMessage: mailMessage,
    });
  } catch (e) {
    user.resetPasswordExpire = undefined;
    user.resetPasswordToken = undefined;
    await user.save({ validateBeforeSave: false });
    next(new errorHandler(e.message, 401));
  }
});
// reset password
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const token = req.params.id;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new errorHandler("Reset password is invalid or expired", 400));
  }
  if (req.body.password != req.body.confirmPassword) {
    return next(new errorHandler("Password dosnt match", 401));
  }
  user.password = req.body.password;
  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;
  await user.save();
  sendJwt(user, 201, "reset password successfully", res);
});

// user logout
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("jwtToken", null, {
    httpOnly: true,
    expires: new Date(Date.now()),
  });
  res.status(200).json({ success: true, message: "logout successfully" });
});

exports.getServiceById = asyncHandler(async (req, res, next) => {
  try {
    const id = req.params.id;
    const service = await Service.findById(id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
});

// update password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { password, confirmPassword, oldPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  const passwordCheck = await user.comparePassword(oldPassword);
  if (!passwordCheck) {
    return next(new errorHandler("Wrong password", 400));
  }
  if (password != confirmPassword) {
    return next(new errorHandler("password dosent match", 400));
  }
  user.password = password;
  await user.save();
  sendJwt(user, 201, "password updated successfully", res);
});

// my details
exports.userDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  res.status(200).send({ success: true, user });
});

exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const { name, email, number, address } = req.body;

  const user = await User.findById(req.user.id);

  if (!name && !email && !number) {
    // Only update the address if name, email, and number are not provided
    if (address) {
      user.addresses.push(address);
      await user.save();
      res.status(201).json({ success: true, user });
    } else {
      res.status(400).json({ success: false, message: "Address is required." });
    }
  } else {
    // Update name, email, and number along with the address
    user.name = name || user.name;
    user.email = email || user.email;
    user.number = number || user.number;
    if (address) {
      user.addresses.push(address);
    }
    await user.save();
    res.status(201).json({ success: true, user });
  }
});

// get all users---admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({ success: true, users });
});

// get single user---admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({ success: true, user });
});

// update user role ---admin
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  let user = await User.findById(id);
  if (!user) {
    return next(new errorHandler(`user dosent exist with id ${id}`), 400);
  }
  const updatedUserData = {
    role: req.body.role,
  };
  user = await User.findByIdAndUpdate(id, updatedUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(201).json({ success: true, user });
});

// delete user --admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(new errorHandler(`user dosent exist with id ${id}`), 400);
  }
  const message = await User.findByIdAndDelete(id);

  res.status(200).json({ success: true, message: "user deleted successfully" });
});
