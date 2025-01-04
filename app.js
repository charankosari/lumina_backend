const express = require("express");
const app = express();
const user = require("./routes/userRouter");
const errorMiddleware = require("./middleware/error");
const cookieParser = require("cookie-parser");
// const Admin = require("./routes/AdminRoutes");
const logger = require("morgan");
const cors = require("cors");
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(logger("tiny"));
app.use(express.json());
app.use("/api/user", user);
// app.use("/api/admin", Admin);

app.use(errorMiddleware);

module.exports = app;
