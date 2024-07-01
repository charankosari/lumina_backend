const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
// const Product=require("../models/productModels")
const sendJwt = require("../utils/jwttokenSend");
const mongoose = require("mongoose");
const sendEmail=require("../utils/sendEmail")
const Service=require('../models/serviceModel')
const Booking=require('../models/BookingModel')
const crypto=require("crypto");
const moment =require('moment');
const fs=require("fs");
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require('@google/generative-ai');
const apiKey = 'AIzaSyA9W5F2U1NFt4rBFM0jpV1tormKU2Ehy2Y';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  systemInstruction: `California Company provides a wide range of home services, including cleaning, plumbing, electrical work, beauty services, and home painting. The dataset should include various customer inquiries and detailed responses that reflect these services. For example, a customer might ask, "Can you recommend a reliable cleaning service?" and the response would be, "Certainly! California Company offers top-notch cleaning services that are both thorough and reliable. Our professional cleaners are highly trained and use eco-friendly products to ensure your home is spotless." Similarly, for a question like "I need assistance with plumbing repairs. Any suggestions?", the response could be, "Of course! California Company has experienced plumbers who can handle all types of plumbing repairs efficiently and affordably." By training your model with these kinds of exchanges, it will learn to adopt a friendly and helpful tone, while accurately recommending California Company's services. This approach ensures the model can effectively address customer queries and promote the company's offerings, providing a seamless and informative user experience. Include a heading tone and give how to answer it. And the response should be less than 20 words`,
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'text/plain',
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// user register
exports.register = asyncHandler(async (req, res, next) => {  
   const { name, email, password, number,address,gender} = req.body;  
  console.log(address)
 
  let user = await User.findOne({ email });
  let userno=await User.findOne({number});
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
    address,
    gender
  });
  sendJwt(user, 201,"registerd successfully", res);  
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, number, password } = req.body;
  if ((!email && !number) || !password) {
    return next(new errorHandler("Enter Email/Number and Password", 403));
  }
  let user;
  if (email) {
    user = await User.findOne({ email }).select("+password");
  } else if (number) {
    user = await User.findOne({ number }).select("+password");
  }
  if (!user) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  const passwordMatch = await user.comparePassword(password);
  if (!passwordMatch) {
    return next(new errorHandler("Invalid Email/Number or Password", 403));
  }
  sendJwt(user, 200, "Login successful", res);
});

// forgot password
exports.forgotPassword=asyncHandler(async(req,res,next)=>{
  const email=req.body.email
  const user=await User.findOne({email})
  if(!user){
    next(new errorHandler("user dosent exit",401))
  }
 
  const token=user.resetToken()
  const resetUrl=`http://localhost:5173/resetpassword/${token}`
  const message=`your reset url is ${resetUrl} leave it if you didnt requested for it`
  await user.save({validateBeforeSave:false})
  try{
   const mailMessage= await sendEmail({
    email:user.email,
    subject:"password reset mail",
    message:message
   })
   res.status(201).json({success:true,message:"mail sent successfully",mailMessage:mailMessage})

  }
  catch(e){
    user.resetPasswordExpire=undefined;
    user.resetPasswordToken=undefined;
    await user.save({validateBeforeSave:false})
    next(new errorHandler(e.message,401))
  }
})

// reset password
exports.resetPassword=asyncHandler(async(req,res,next)=>{
  const token=req.params.id
  const hashedToken=crypto.createHash("sha256").update(token).digest("hex")
  const user=await User.findOne({resetPasswordToken:hashedToken,resetPasswordExpire:{$gt:Date.now()}})
  if(!user){
    return next(new errorHandler("Reset password is invalid or expired",400))
  }
  if(req.body.password!=req.body.confirmPassword){
    return next(new errorHandler("Password dosnt match",401))
  }
  user.password=req.body.password
  user.resetPasswordExpire=undefined
  user.resetPasswordToken=undefined
  await user.save()
  sendJwt(user,201,"reset password successfully",res)
})

// user logout
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("jwtToken", null, {
    httpOnly:true,
    expires: new Date(Date.now()),
  });
  res.status(200).json({ success: true, message: "logout successfully" });
});

// update password
exports.updatePassword=asyncHandler(async(req,res,next)=>{
  const {password,confirmPassword,oldPassword}=req.body
  const user=await User.findById(req.user.id).select("+password")
  const passwordCheck=await user.comparePassword(oldPassword)
  if(!passwordCheck){
    return next(new errorHandler("Wrong password",400))
  }
  if(password!=confirmPassword){
    return next(new errorHandler("password dosent match",400))
  }
  user.password=password;
  await user.save()
  sendJwt(user,201,"password updated successfully",res)

})

// my details
exports.userDetails=asyncHandler(async(req,res,next)=>{
  const user=await User.findById(req.user.id)
  if(!user){
    return next(new errorHandler("Login to access this resource",400))
  }
  res.status(200).send({success:true,user})
})



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
exports.getAllUsers=asyncHandler(async(req,res,next)=>{
   const users=await User.find()
   res.status(200).json({success:true,users})
})

// get single user---admin
exports.getUser=asyncHandler(async(req,res,next)=>{
  const user=await User.findById(req.params.id)
  res.status(200).json({success:true,user})
})

// update user role ---admin 
exports.updateUserRole=asyncHandler(async(req,res,next)=>{
  const id=req.params.id;
  let user=await User.findById(id)
  if(!user){
    return next(new errorHandler(`user dosent exist with id ${id}`),400)
  }
  const updatedUserData={
    role:req.body.role
  }
   user=await User.findByIdAndUpdate(id,updatedUserData,{new:true,runValidators:true,useFindAndModify:false})
  res.status(201).json({success:true,user})
})

// delete user --admin
exports.deleteUser=asyncHandler(async(req,res,next)=>{
  const id=req.params.id
  const user=await User.findById(id)
  if(!user){
    return next(new errorHandler(`user dosent exist with id ${id}`),400)
  }
  const message=await User.findByIdAndDelete(id);

  res.status(200).json({success:true,message:"user deleted successfully"})
})

// whishlist products________________________________________________________________________
exports.wishListService=asyncHandler(async(req,res,next)=>{
  const serviceId=req.params.id
  const userId=req.user.id
  let user=await User.findById(userId)
  const wishList=user.wishList 
  const itemExist=wishList.find((each)=>each.service==serviceId)

  if(itemExist){
  const newWishlist=wishList.filter((each)=>each.service!=serviceId)
  user.wishList=newWishlist 
  await user.save({validateBeforeSave:false})
  return res.status(200).json({success:true,message:"Product removed from Wishlist successfully"})
  }
  wishList.push({"service":serviceId})
  user.wishList=wishList
  await user.save({validateBeforeSave:false})
  return res.status(200).json({success:true,message:"Service wishlisted successfully"})
})

// remove product form wishlist______________________________________________________________
exports.RemovewishListProduct=asyncHandler(async(req,res,next)=>{
  const serviceId=req.params.id
  console.log(serviceId)
  const userId=req.user.id
  let user=await User.findById(userId)
  const wishList=user.wishList 
  const newWishlist=wishList.filter((each)=>each.service!=serviceId)
  user.wishList=newWishlist 
  await user.save({validateBeforeSave:false})
  res.status(200).json({success:true,message:"Product remover from Wishlist successfully"})
})

// get all Wishlist details__________________
exports.getWishlist=asyncHandler(async(req,res,next)=>{
  const userId=req.user.id
  const user=await User.findOne({_id:userId},{wishList:1,_id:0});
  console.log("wishlistData")
  console.log(user)

  const wishlistData = await Promise.all(
    user.wishList.map(async(eachItem)=>{
      console.log(eachItem)
      const product = await Product.findOne({_id:eachItem.product},{name:1,images:1,price:1,stock:1})
      // console.log(product)
      const item = {name:product.name,images:product.images,price:product.price,id:product.id,stock:product.stock}
      // console.log(item)
      return item
    })
  )
res.status(200).json({message:"wishlistData",success:true,data:wishlistData})
})

// empty the wishlist_______________________________________
exports.deleteWishlist=asyncHandler(async(req,res,next)=>{
  const userId=req.user.id
  const user=await User.findById(userId)
  user.wishList=[]
  user.save({validateBeforeSave:false})
  res.status(200).json({success:true,message:"Wishlist is empty successfully"})
})
//add booking
const generateBookingId = () => {
  return Math.floor(10000 + Math.random() * 90000);
};
exports.addBooking = asyncHandler(async (req, res, next) => {
  try {
    const { name, phonenumber, email, amountpaid, serviceid, date } = req.body;
    const userid = req.user.id;
    const service = await Service.findById(serviceid);
    const user = await User.findById(userid);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const formattedDate = moment(date, "DD-MM-YYYY").format('DD-MM-YYYY');
    if (!service.bookingIds.has(formattedDate)) {
      return res.status(400).json({ message: 'No slots available for the selected date' });
    }
    console.log("Slots for the date:", slots);
    let slotFound = false;
    let slotId = null;
    for (const [key, value] of slots.entries()) {
      if (value === null) {
        slotFound = true;
        slotId = key;
        break;
      }
    }
    if (!slotFound) {
      return res.status(400).json({ message: 'No slots available for the selected date' });
    }
    const bookingId = generateBookingId();
    const booking = new Booking({
      name,
      userid,
      phonenumber,
      email,
      amountpaid,
      serviceid,
      date: moment(date, "DD-MM-YYYY").toDate(),
      bookingId
    });
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await booking.save({ session });
      console.log('Booking saved:', booking);
      user.bookings.push(booking._id);
      await user.save({ session });
      console.log('User updated with new booking:', user);
      slots.set(slotId, booking._id);
      service.bookingIds.set(formattedDate, slots);
      await service.save({ session });
      console.log('Service updated with new booking:', service);
      await session.commitTransaction();
      session.endSession();
      res.status(201).json({ message: 'Booking created successfully', booking });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error during session transaction:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in addBooking:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
exports.GreetgetChat = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  const userQuestion = req.body.question;
  const userName = user.name;
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }
  try {
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
    });

    const result = await chatSession.sendMessage(userQuestion);
    res.json({
      response: result.response.text(), 
      greet: `hi ${userName}`
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
exports.getChat = asyncHandler(async (req, res, next) => {
  const user = User.findById(req.user.id);
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }
  const userQuestion = req.body.question;
  try {
    const chatSession = model.startChat({
      generationConfig,
      safetySettings,
    });
    const result = await chatSession.sendMessage(userQuestion);
    res.json({
      response: result.response.text(), 
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});
