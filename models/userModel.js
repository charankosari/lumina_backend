const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please Enter Username"],
    maxlength: [40, "Username should not exceed more than 40 characters"],
    minlength: [4, "Username should not be less than 4 characters"],
  },
  email: {
    type: String,
    required: [true, "Please Enter User Email"],
    unique: true,
    validate: [validator.isEmail, "Please enter valid email"],
  },
  number: {
    type: Number,
    unique: true,
    validate: {
      validator: function (v) {
        return /^\d{10}$/.test(v.toString());
      },
      message: (props) => `${props.value} is not a valid 10-digit number!`,
    },
    required: true,
  },
  password: {
    type: String,
    required: [true, "Please Enter User Password"],
    minlength: [8, "Password should be greater than 8 characters"],
    select: false,
  },
  cart: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Product", // Store only product IDs in the cart
    },
  ],
  bookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
  ],
  role: {
    type: String,
    default: "user",
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Pre hook to check whether password is modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Generate JWT token
userSchema.methods.jwtToken = function () {
  let expiresIn = process.env.jwt_expire || "2d"; // Default to '2d' if not set

  // Ensure it's a string or number
  if (typeof expiresIn === "string" || typeof expiresIn === "number") {
    return jwt.sign({ id: this._id }, process.env.jwt_secret, { expiresIn });
  }

  throw new Error("Invalid expiresIn value");
};

// Password compare
userSchema.methods.comparePassword = async function (password) {
  console.log(password, this.password);
  return await bcrypt.compare(password, this.password);
};

// Generate reset token
userSchema.methods.resetToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  this.resetPasswordToken = hashedToken;
  this.resetPasswordExpire = Date.now() + 1000 * 60 * 60 * 24 * 15;
  return token;
};

// Method to get all products in cart, populated with product details
userSchema.methods.getCartProducts = async function () {
  const Product = mongoose.model("Product"); // Assuming you have a Product model
  const cartProducts = await Product.find({ _id: { $in: this.cart } });
  return cartProducts;
};

module.exports = mongoose.model("User", userSchema);
