const express=require('express')
const router=express.Router()
const {register, login,logout,forgotPassword,createReview,createBooking,getServiceById,getUserBookings,resetPassword,updatePassword,userDetails,profileUpdate,GreetgetChat,updateUserRole,deleteUser,getWishlist,wishListService,RemovewishListProduct,deleteWishlist, getChat} =require("../controllers/userController")
const {isAuthorized,roleAuthorize,}=require("../middleware/auth")
const upload=require('../middleware/multer')


router.route("/register").post(register)
router.route("/login").post(login)
router.route("/logout").post(logout)  // frontend 
router.route("/forgotpassword").post(forgotPassword)
router.route("/resetpassword/:id").post(resetPassword)
router.route("/me").get(isAuthorized,userDetails)
router.route("/password/update").put(isAuthorized,updatePassword)
router.route("/me/profileupdate").put(isAuthorized,profileUpdate)
router.route('/addbooking').post(isAuthorized,createBooking)
router.route('/getbooking').get(isAuthorized,getUserBookings)
router.route('/chat').post(isAuthorized,getChat)
router.route('/greetchat').post(isAuthorized,GreetgetChat)
router.route('/createreview').post(isAuthorized,createReview)
// router.route('/getservice/:id').get(getServiceById)
router.route('/getservice/:id').get(getServiceById)

// router.route("/admin/getallusers").get(isAuthorized,roleAuthorize("admin"),getAllUsers)
// router.route("/admin/user/:id").get(isAuthorized,roleAuthorize("admin"),getUser)
// .put(isAuthorized,roleAuthorize("admin"),updateUserRole).delete(isAuthorized,roleAuthorize("admin"),deleteUser)
router.route("/me/wishlist/:id").post(isAuthorized,wishListService).delete(isAuthorized,wishListService)
router.route("/me/wishlist").get(isAuthorized,getWishlist).delete(isAuthorized,deleteWishlist)


module.exports=router