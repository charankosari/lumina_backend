const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  phonenumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  amountpaid: {
    type: Number,
    required: true,
  },
  serviceid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
  },
  date: {
    type: Date,
    required: true,
  },
  bookingId:{
    type:Number,
    required:true
  }
}, {
  timestamps: true
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
