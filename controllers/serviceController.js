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
const moment =require('moment')



// user register
exports.register = asyncHandler(async (req, res, next) => {  
  const { name, email, password,description, number,amount,service,addresses,image} = req.body;  
 
  let ser = await Service.findOne({ email });
  let serno=await Service.findOne({number});
  if (ser) {
    return next(new errorHandler("Email already exist", 401));
  }
  if (serno) {
    return next(new errorHandler("Number already exist", 401));
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
    amount
  });
  sendJwtSer(ser, 201,"registerd successfully", res);  
});

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
  console.log(ser)
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
    // Only update the address if name, email, and number are not provided
   
  } else {
    // Update name, email, and number along with the address
    ser.name = name || ser.name;
    ser.email = email || ser.email;
    ser.number = number || ser.number;
    ser.description = description || ser.description;
    ser.amount = amount || ser.amount;
  
    await ser.save();
    res.status(201).json({ success: true, ser });
  }
});

exports.addMoreSessions = asyncHandler(async (req, res, next) => {
  try {
    const { date, noOfDays, count } = req.body;
    const service = await Service.findById(req.ser.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const startDate = moment(date, "DD-MM-YY");
    if (!startDate.isValid()) {
      return res.status(400).json({ message: 'Invalid start date' });
    }

    for (let i = 0; i < noOfDays; i++) {
      const currentDate = moment(startDate).add(i, 'days');
      const dateStr = currentDate.format('DD-MM-YY');

      if (!service.bookingIds.has(dateStr)) {
        const slots = {};
        for (let j = 0; j < count; j++) {
          slots[`id${j + 1}`] = null;
        }
        service.bookingIds.set(dateStr, slots);
      }
    }

    await service.save();
    res.status(201).json({ message: 'Sessions added successfully', service });
  } catch (error) {
    console.error("Error in addMoreSessions:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

exports.getServices=asyncHandler(async(req,res,next)=>{
  const services=await Service.find()
  res.status(200).json({success:true,services})
})
