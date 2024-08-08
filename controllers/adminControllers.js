const asyncHandler = require('../middleware/asynchandler')
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const Service=require("../models/serviceModel")
const Booking =require("../models/BookingModel.js")


exports.getAllUsers=asyncHandler(async(req,res,next)=>{
    console.log('started')
    const items_to_return='_id name email number addresses'
const users=await User.find().select(items_to_return)
res.status(200).json({
    success: true,
    data: users
});
})
exports.getAllServices=asyncHandler(async(req,res,next)=>{
    const items_to_return='_id name email number address service addresses role'
const services=await Service.find().select(items_to_return)
res.status(200).json({
    success: true,
    data: services
});
})
exports.getAllBookings=asyncHandler(async(req,res,next)=>{
const bookings=await Booking.find()
res.status(200).json({
    success: true,
    data: bookings
});
})

exports.disableService = asyncHandler(async (req, res, next) => {
    const { serviceId } = req.body;
    const service = await Service.findById(serviceId);
    if (!service) {
        return res.status(404).json({ message: 'Service not found' });
    }
    service.role = service.role === 'service' ? 'disabled' : 'service';
    await service.save();
    const message = service.role === 'disabled' ? 'Service disabled' : 'Service enabled';

    res.status(200).json({ message });
});
exports.getIncomeData = asyncHandler(async (req, res, next) => {
    try {
        const services = await Service.find({});
        const bookings = await Booking.find({});

        let totalIncome = 0;
        const serviceWiseIncome = {};
        const employeeIncomes = {};
        const dailyIncome = {};
        const serviceIdToNameMap = {};
        services.forEach(service => {
            serviceIdToNameMap[service._id] = service.service;
            serviceWiseIncome[service.service] = 0; 
            employeeIncomes[service._id] = 0; 
        });
        bookings.forEach(booking => {
            const date = booking.date.toISOString().split('T')[0];
            const serviceId = booking.serviceid;
            if (!dailyIncome[date]) {
                dailyIncome[date] = 0;
            }
            dailyIncome[date] += booking.amountpaid;
            const serviceName = serviceIdToNameMap[serviceId];
            if (serviceName) {
                serviceWiseIncome[serviceName] += booking.amountpaid;
            }
            if (employeeIncomes.hasOwnProperty(serviceId)) {
                employeeIncomes[serviceId] += booking.amountpaid;
            }
            totalIncome += booking.amountpaid;
        });

        res.status(200).json({
            totalIncome,
            serviceWiseIncome,
            employeeIncomes,
            dailyIncome
        });
    } catch (error) {
        next(error);
    }
});