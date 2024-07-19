const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const Service=require("../models/serviceModel")
const sendJwtSer = require("../utils/sendJwtSer");
const sendEmail=require("../utils/sendEmail")
const crypto=require("crypto")
const cloudinary=require("../utils/cloudinary")
const fs=require("fs");
const { whitelist } = require("validator");
const { execPath } = require("process");
const Booking = require('../models/BookingModel')

// user register
const moment = require('moment');
exports.register = async (req, res, next) => {
  const { name, email, password, description, number, amount, service, addresses, image, date, days } = req.body;
  try {
    let ser = await Service.findOne({ email });
    if (ser) {
      return res.status(401).json({ error: "Email already exists" });
    }
    let serno = await Service.findOne({ number });
    if (serno) {
      return res.status(401).json({ error: "Number already exists" });
    }
    const startDate = moment(date, 'YYYY-MM-DD', true);
    if (!startDate.isValid()) {
      return res.status(400).json({ error: "Invalid start date format. Please provide dates in YYYY-MM-DD format." });
    }
    const bookingIds = {};
    for (let i = 0; i < days; i++) {
      const currentDate = startDate.clone().add(i, 'days').format('YYYY-MM-DD');
      const subBookingIds = {};
      for (let j = 1; j <= 10; j++) {
        subBookingIds[j.toString()] = { id: null }; 
      }
      bookingIds[currentDate] = subBookingIds;
    }
    ser = await Service.create({
      name,
      email,
      password,
      number,
      description,
      addresses,
      service,
      image,
      amount,
      date: startDate.format('YYYY-MM-DD'), 
      bookingIds: bookingIds
    });
    sendJwtSer(ser, 201, "Registered successfully", res);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, number, password } = req.body;
  if ((!email && !number) || !password) {
    return next(new errorHandler("Enter Email/Number and Password", 403));
  }
  let ser;
  if (email) {
    ser = await Service.findOne({ email }).select("+password");
  } else if (number) {
    ser = await Service.findOne({ number }).select("+password");
  }
  if (!ser) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  const passwordMatch = await ser.comparePassword(password);
  if (!passwordMatch) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  sendJwtSer(ser, 200, "Login successful", res);
});

// forgot password
exports.forgotPassword=asyncHandler(async(req,res,next)=>{
  const email=req.body.email
  const ser=await Service.findOne({email})
  if(!ser){
    next(new errorHandler("user dosent exit",401))
  }
 
  const token=ser.resetToken()
  const resetUrl=`http://localhost:5173/resetpassword/${token}`
  const message=`your reset url is ${resetUrl} leave it if you didnt requested for it`
  await ser.save({validateBeforeSave:false})
  try{
   const mailMessage= await sendEmail({
    email:ser.email,
    subject:"password reset mail",
    message:message
   })
   res.status(201).json({success:true,message:"mail sent successfully",mailMessage:mailMessage})

  }
  catch(e){
    ser.resetPasswordExpire=undefined;
    ser.resetPasswordToken=undefined;
    await ser.save({validateBeforeSave:false})
    next(new errorHandler(e.message,401))
  }
})

// reset password
exports.resetPassword=asyncHandler(async(req,res,next)=>{
  const token=req.params.id
  const hashedToken=crypto.createHash("sha256").update(token).digest("hex")
  const ser=await Service.findOne({resetPasswordToken:hashedToken,resetPasswordExpire:{$gt:Date.now()}})
  if(!ser){
    return next(new errorHandler("Reset password is invalid or expired",400))
  }
  if(req.body.password!=req.body.confirmPassword){
    return next(new errorHandler("Password dosnt match",401))
  }
  ser.password=req.body.password
  ser.resetPasswordExpire=undefined
  ser.resetPasswordToken=undefined
  await ser.save()
  sendJwtSer(ser,201,"reset password successfully",res)
})



// update password
exports.updatePassword=asyncHandler(async(req,res,next)=>{
  const {password,confirmPassword,oldPassword}=req.body
  const ser=await Service.findById(req.ser.id).select("+password")
  const passwordCheck=await ser.comparePassword(oldPassword)
  if(!passwordCheck){
    return next(new errorHandler("Wrong password",400))
  }
  if(password!=confirmPassword){
    return next(new errorHandler("password dosent match",400))
  }
  ser.password=password;
  await ser.save()
  sendJwtSer(ser,201,"password updated successfully",res)

})

// my details
exports.userDetails=asyncHandler(async(req,res,next)=>{
  const ser=await Service.findById(req.ser.id)
  if(!ser){
    return next(new errorHandler("Login to access this resource",400))
  }
  res.status(200).send({success:true,ser})
})



exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const { name, email, number,amount,description } = req.body;

  const ser = await Service.findById(req.ser.id);

  if (!name && !email && !number) {
   
  } else {
    ser.name = name || ser.name;
    ser.email = email || ser.email;
    ser.number = number || ser.number;
    ser.description = description || ser.description;
    ser.amount = amount || ser.amount;
  
    await ser.save();
    res.status(201).json({ success: true, ser });
  }
});

//

exports.getServiceBookings = async (req, res, next) => {
  const serviceId = req.ser.id;
  console.log(serviceId)
  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const bookingIds = [];
    for (const date in service.bookingIds) {
      for (const slot in service.bookingIds[date]) {
        const bookingId = service.bookingIds[date][slot].id;
        if (bookingId) {
          bookingIds.push(bookingId);
        }
      }
    }

    const bookings = await Booking.find({ _id: { $in: bookingIds } });

    const detailedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const user = await User.findById(booking.userid, 'name email phonenumber');
        return { ...booking.toObject(), user };
      })
    );

    res.status(200).json({ bookings: detailedBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.addSlots = async (req, res, next) => {
  const {  date, days } = req.body;
const serviceId=req.ser.id;
  try {
    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const startDate = moment(date, 'YYYY-MM-DD', true);
    if (!startDate.isValid()) {
      return res.status(400).json({ error: "Invalid start date format. Please provide dates in YYYY-MM-DD format." });
    }
    const slotsToAdd = {};
    for (let i = 0; i < days; i++) {
      const currentDate = startDate.clone().add(i, 'days').format('YYYY-MM-DD');
      const subSlots = {};
      for (let j = 1; j <= 10; j++) {
        subSlots[j.toString()] = { id: null }; 
      }
      slotsToAdd[currentDate] = subSlots;
    }
    const updatedBookingIds = { ...service.bookingIds, ...slotsToAdd };
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { $set: { bookingIds: updatedBookingIds } },
      { new: true }
    );
    res.status(200).json({ message: "Slots added successfully", service: updatedService });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};



exports.getServices=asyncHandler(async(req,res,next)=>{
  const services=await Service.find()
  res.status(200).json({success:true,services})
})
