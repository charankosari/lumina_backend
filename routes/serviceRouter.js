const express=require("express")
const router=express.Router()
const {register,login  ,forgotPassword, resetPassword,userDetails,updatePassword,profileUpdate,addMoreSessions}=require('../controllers/serviceController')
const {isAuthorized,isAuthorizedSer,roleAuthorize}=require("../middleware/auth")


router.route("/register").post(register)
router.route("/login").post(login)
router.route("/forgotpassword").post(forgotPassword)
router.route("/resetpassword/:id").post(resetPassword)
router.route("/me").get(isAuthorizedSer,userDetails)
router.route("/password/update").put(isAuthorizedSer,updatePassword)
router.route("/me/profileupdate").put(isAuthorizedSer,profileUpdate)
router.route("/me/addmoresessions").post(isAuthorizedSer,addMoreSessions)

module.exports=router