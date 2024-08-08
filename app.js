const express=require("express")
const app=express()
const user=require("./routes/userRouter")
const service=require("./routes/serviceRouter")
const errorMiddleware=require("./middleware/error")
const cookieParser=require("cookie-parser")
const Admin =require('./routes/AdminRoutes')
const logger = require("morgan")
const cors=require("cors")
app.use(cors({credentials:true, origin:true}));
app.use(cookieParser())
app.use(logger("tiny"))
app.use(express.json())
app.use("/api/c3/user",user)
app.use("/api/c3/admin",Admin)
app.use("/api/c3/ser",service)

app.use(errorMiddleware)


module.exports=app