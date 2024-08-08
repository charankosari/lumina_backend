const {getAllUsers, getAllServices}=require("../controllers/adminControllers")
const {isAuthorized, roleAuthorize}=require("../middleware/auth")
const Router=require("express").Router()

Router.route('/allusers').get(isAuthorized,roleAuthorize('admin'),getAllUsers)
Router.route('/allservices').get(isAuthorized,roleAuthorize('admin'),getAllServices)

module.exports=Router

