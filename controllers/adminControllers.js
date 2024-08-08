const asyncHandler = require('../middleware/asynchandler')
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const Service=require("../models/serviceModel")
const Booking =require("../models/BookingModel.js")


exports.getAllUsers=asyncHandler(async(req,res,next)=>{
    console.log('started')
    const items_to_return='_id name email number addresses'
const users=await User.find().select(items_to_return)
console.log(users)
res.status(200).json({
    success: true,
    data: users
});
})
exports.getAllServices=asyncHandler(async(req,res,next)=>{
    const items_to_return='_id name email number address service addresses '
const services=await Service.find().select(items_to_return)
console.log(services)
res.status(200).json({
    success: true,
    data: services
});
})