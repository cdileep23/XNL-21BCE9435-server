require('dotenv').config();

const express = require("express");
const http=require('http')

const connectDB = require("./db.js");
var cookieParser = require('cookie-parser')
const cors=require('cors')
const userRouter=require('./route/user.router.js')

const jobRouter=require('./route/job.route.js')
const BidRouter=require('./route/bid.route.js')


const app = express();
const server=http.createServer(app)

const PORT = process.env.PORT ;
app.use(cors({origin:'http://localhost:5173',credentials:true}))
app.use(cookieParser())
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Job based on ai matchings");
});

app.use('/', userRouter)
app.use('/', jobRouter)
app.use('/',BidRouter)
const startServer = async () => {
  try {
     await connectDB();
    console.log("Database connection established...");
    server.listen(PORT, () => {
      console.log(`Server is successfully listening on port ${PORT}...`);
    });
  } catch (err) {
    console.error("Database cannot be connected!!", err);
  }
};

startServer();