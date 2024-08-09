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
        
        // Map service IDs to service names and types
        const serviceIdToNameMap = {}; // For employee incomes
        const serviceIdToTypeMap = {}; // For service-wise income
        services.forEach(service => {
            serviceIdToNameMap[service._id] = service.name; // Employee income map
            serviceIdToTypeMap[service._id] = service.service; // Service income map
        });

        let totalIncome = 0;
        const serviceWiseIncome = {}; // By service type
        const employeeIncomes = {}; // By employee name
        const dailyIncome = {};

        // Initialize income tracking
        services.forEach(service => {
            // Initialize service-wise income with service type
            if (!serviceWiseIncome[service.service]) {
                serviceWiseIncome[service.service] = 0;
            }
            // Initialize employee incomes with employee name
            if (!employeeIncomes[service.name]) {
                employeeIncomes[service.name] = 0;
            }
        });

        // Calculate income data
        bookings.forEach(booking => {
            const date = booking.date.toISOString().split('T')[0];
            const serviceId = booking.serviceid;
            const amountPaid = booking.amountpaid;

            // Track daily income
            if (!dailyIncome[date]) {
                dailyIncome[date] = 0;
            }
            dailyIncome[date] += amountPaid;

            // Track service-wise income by service type
            const serviceType = serviceIdToTypeMap[serviceId];
            if (serviceType) {
                serviceWiseIncome[serviceType] = (serviceWiseIncome[serviceType] || 0) + amountPaid;
            }

            // Track employee incomes by employee name
            const employeeName = serviceIdToNameMap[serviceId];
            if (employeeName) {
                employeeIncomes[employeeName] = (employeeIncomes[employeeName] || 0) + amountPaid;
            }

            // Total income
            totalIncome += amountPaid;
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