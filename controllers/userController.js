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
let model;
const initializeModel = async () => {
  try {
    const users = await User.find().lean(); 
    const services = await Service.find().lean(); 
    const bookings = await Booking.find().lean();
    const userData = JSON.stringify(users, null, 2); 
    const serviceData = JSON.stringify(services, null, 2); 
    const bookingData = JSON.stringify(bookings, null, 2); 

    const systemInstruction = `OneApp is a trusted California company offering a range of essential home services. We provide detailed information about our users and services to ensure accurate and personalized responses.
    **User Data:**
    ${userData}

    **Service Data:**
    ${serviceData}

    **Booking Data:**
    ${bookingData}

    If anyone asks about the booking details, get details from booking IDs for that user and, with that, user booking details found from bookings data and give him the data.

    Oneapp provides electricians,airconditioner repair,plumbers,home cleaners,landscaping as services at now

    At OneApp, we are committed to delivering reliable and affordable services with a focus on customer satisfaction. Our chatbot is equipped with detailed user and service data to provide accurate responses and assist with various inquiries. Warm regards from the OneApp team!`;

    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: systemInstruction,
    });

    console.log('Model initialized successfully.');

  } catch (error) {
    console.error('Error initializing model:', error);
  }
};
const refreshModelData = async () => {
  try {
    await initializeModel(); 
  } catch (error) {
    console.error('Error refreshing model data:', error);
  }
};

initializeModel();
const fetchInterval = 300000/5;
setInterval(refreshModelData, fetchInterval);

// user register
exports.register = asyncHandler(async (req, res, next) => {  
   const { name, email, password, number,address} = req.body;  
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
  const resetUrl=`http://localhost:3000/resetpassword/${token}`
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

exports.getServiceById = asyncHandler(async (req, res, next) => {
  try {
    const id = req.params.id;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
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
exports.getWishlist = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found', success: false });
  }
  console.log('Fetching wishlist data');
  const wishlistData = await Promise.all(
    user.wishList.map(async (item) => {
      console.log(item);
      try {
        const service = await Service.findById(item.service);
        return service;
      } catch (error) {
        console.error(`Error fetching service with ID: ${item.service}`, error);
        return null;
      }
    })
  );
  const filteredWishlistData = wishlistData.filter(service => service !== null);
  res.status(200).json({ message: 'wishlistData', success: true, data: filteredWishlistData });
});

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

exports.createBooking = async (req, res, next) => {
  const { name, phoneNumber, email, amountpaid, serviceId, date } = req.body;
  const userId = req.user.id; 
  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const bookingDate = new Date(date).toISOString().slice(0, 10); // Convert date to YYYY-MM-DD format
    if (!service.bookingIds || !service.bookingIds[bookingDate]) {
      return res.status(400).json({ error: "No bookings available for this date" });
    }

    let availableSlot = null;
    for (let slot in service.bookingIds[bookingDate]) {
      if (service.bookingIds[bookingDate][slot].id === null) {
        availableSlot = slot;
        break;
      }
    }

    if (!availableSlot) {
      return res.status(400).json({ error: "Bookings are full for this date" });
    }

    const newBooking = new Booking({
      name,
      userid: userId,
      phonenumber: phoneNumber,
      email,
      amountpaid,
      serviceid: serviceId,
      date,
      bookingId: Math.floor(1000 + Math.random() * 9000), // Generate a random booking ID
    });
    await newBooking.save();
    const updatePath = `bookingIds.${bookingDate}.${availableSlot}.id`;
    await Service.findByIdAndUpdate(serviceId, { $set: { [updatePath]: newBooking._id } });
    const updatedService = await Service.findById(serviceId);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.bookings.push(newBooking._id);
    await user.save();

    res.status(201).json({ message: "Booking created successfully", booking: newBooking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUserBookings = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bookingIds = user.bookings;
    const bookings = await Booking.find({ _id: { $in: bookingIds } });

    const detailedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const service = await Service.findById(booking.serviceid, 'name email number amount service');
        return { ...booking.toObject(), service };
      })
    );

    res.status(200).json({ bookings: detailedBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

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


//review

exports.createReview = asyncHandler(async (req, res, next) => {
  const { rating, comment,serviceId } = req.body;
  const userId = req.user.id;

  const service = await Service.findById(serviceId);

  if (!service) {
    res.status(404);
    throw new Error('Service not found');
  }

 
  const user = await User.findById(userId); // Assuming you have a User model

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const review = {
    username: user.name,
    rating: Number(rating),
    comment,
  };

  service.reviews.push(review);
  service.numReviews = service.reviews.length;
  service.overallRating = (service.totalRating+review.rating) /2
  await service.save();

  res.status(201).json({ message: 'Review added' });
});