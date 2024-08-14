const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const reviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: [true, "Please provide a rating (1-5)"],
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating must be at most 5"],
  },
  username: {
    type: String,
    required: [true, "Please provide your username"],
  },
  comment: {
    type: String,
    required: [true, "Please provide a comment"],
  },
}, { _id : false });
const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
    validate: [validator.isEmail, "Please enter a valid email"],
  },
  number: {
    type: Number,
    unique: true,
   
    required: true,
  },
  amount: {
    type: Number,
    required: [true, "Please enter the amount"],
  },
  service: {
    type: String,
    required: [true, "Please enter the service type"],
  },
  bookingIds: {
    type: Object, 
    default: {},
  },
  image: {
    required: true,
    type: String
  },
  description: {
    type: String,
    required: [true, "Please enter the service description"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    select: false,
  },
  addresses: [
    {
      address: {
        type: String,
        required: [true, "Please enter an address"]
      },
      pincode: {
        type: String,
        required: [true, "Please enter pincode"],
      }
    }
  ],
  numReviews: {
    type: Number,
    default: 0,
    required:false
  },
  overallRating: {
    type: Number,
    default: 0,
    required:false
  },
  role: {
    type: String,
    default: "service",
  },
  reviews: {
    type: [reviewSchema],
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});
serviceSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// generate Jwttoken
serviceSchema.methods.jwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.jwt_secret, {
    expiresIn: process.env.jwt_epire,
  });
};

// password compare
serviceSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
  
};

serviceSchema.methods.resetToken= function(){
  const token=crypto.randomBytes(20).toString("hex")
  const hashedToken=crypto.createHash("sha256").update(token).digest("hex")
  this.resetPasswordToken=hashedToken
  this.resetPasswordExpire=Date.now()+(1000*60*60*24*15)
  return token
}

module.exports = mongoose.model("Service", serviceSchema);