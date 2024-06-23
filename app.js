const express=require("express")
const app=express()
// const product=require("./routes/productsRouter")
const user=require("./routes/userRouter")
const service=require("./routes/serviceRouter")
const errorMiddleware=require("./middleware/error")
const cookieParser=require("cookie-parser")
const logger = require("morgan")
const cors=require("cors")



// cors
app.use(cors({credentials:true, origin:true}));
// cookie parser
app.use(cookieParser())
// morgan logger [to show the request details in console]
app.use(logger("tiny"))
// body parser 
app.use(express.json())
// // url encoded
// express.urlencoded({extended: false})
// product route
// app.use("/api/v1",product)
// user route
app.use("/api/c3/user",user)
app.use("/api/c3/ser",service)
// order route
// app.use("/api/cg",order)
// errorHandler Middleware
app.use(errorMiddleware)

// to get paymentgateway key
// app.get("/payment/getKey",(req,res,next)=>res.status(200).json({key:process.env.RAZORPAY_ID}))

module.exports=app