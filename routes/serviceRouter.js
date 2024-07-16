const express=require("express")
const router=express.Router()
const {register,login  ,forgotPassword,getServiceBookings, getServices,addSlots,resetPassword,userDetails,updatePassword,profileUpdate,addMoreSessions}=require('../controllers/serviceController')
const {isAuthorized,isAuthorizedSer,roleAuthorize}=require("../middleware/auth")


router.route("/register").post(register)
router.route("/login").post(login)
router.route("/forgotpassword").post(forgotPassword)
router.route("/resetpassword/:id").post(resetPassword)
router.route("/getbookings").get(isAuthorizedSer,getServiceBookings)
router.route("/slots").post(isAuthorizedSer,addSlots)
router.route("/me").get(isAuthorizedSer,userDetails)
router.route("/allservice").get(getServices)
router.route("/password/update").put(isAuthorizedSer,updatePassword)
router.route("/me/profileupdate").put(isAuthorizedSer,profileUpdate)

module.exports=router