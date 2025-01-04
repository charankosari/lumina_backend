const express = require("express");
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  updatePassword,
  userDetails,
  profileUpdate,
} = require("../controllers/userController");
const { isAuthorized, roleAuthorize } = require("../middleware/auth");

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/forgotpassword").post(forgotPassword);
router.route("/me").get(isAuthorized, userDetails);
router.route("/password/update").put(isAuthorized, updatePassword);
router.route("/me/profileupdate").put(isAuthorized, profileUpdate);

module.exports = router;
