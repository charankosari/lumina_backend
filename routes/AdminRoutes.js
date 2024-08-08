const {getAllUsers, getAllServices,getIncomeData,disableService,getAllBookings}=require("../controllers/adminControllers")
const {isAuthorized, roleAuthorize}=require("../middleware/auth")
const Router=require("express").Router()

Router.route('/allusers').get(isAuthorized,roleAuthorize('admin'),getAllUsers)
Router.route('/allservices').get(isAuthorized,roleAuthorize('admin'),getAllServices)
Router.route('/disableservice').put(isAuthorized,roleAuthorize('admin'),disableService)
Router.route('/getalldata').get(isAuthorized,roleAuthorize('admin'),getIncomeData)
Router.route('/getallbookings').get(isAuthorized,roleAuthorize('admin'),getAllBookings)

module.exports=Router

