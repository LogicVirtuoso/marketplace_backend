require("dotenv").config();
const express = require("express");
const compression = require("compression");
const bodyParser = require("body-parser");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs-extra");
const fileUpload = require("express-fileupload");
const http = require("http");
const https = require("https");
const {
  SERVER_URL,
  DB_OPTION,
  PORT,
  CLIENT_ORIGIN,
  DB_URL,
} = require("./config");

const Notification = require("./model/notification");

const app = express();
const server = http.createServer(app);

const io = require("./io").initialize(server);
const reportController = require("./controller/report");

const blogRoute = require("./routes/blog");
const soldLicenseRoute = require("./routes/soldLicenses");
const spotifyRoute = require("./routes/spotify");
const listedLicenseRoute = require("./routes/listedLicenses");
const userRoute = require("./routes/user");
const notificationRoute = require("./routes/notification");
const reportRoute = require("./routes/report");
const publicSalesRoute = require("./routes/publicSalesDatabase");
const licenseCheckerRoute = require("./routes/licenseChecker");
const socialLinkingRoute = require("./routes/socialLinking");
const historyRoute = require("./routes/history");
const offerRoute = require("./routes/offers");
const idenfyRoute = require("./routes/idenfy");
const licenseChangeRoute = require("./routes/licenseChanges");
const SecurityRoute = require("./routes/loggedUsers");
// const auth = require('./middleware/auth');
const { startIndexing } = require("./subgraph");
const { isSpotifyID } = require("./utils");
const { getBeneficiaries } = require("./controller/idenfy");

app.use(bodyParser.json({ limit: "5mb" }));
app.use(compression());
// Only allow requests from our client
app.use(cors({ origin: "*" }));

app.use(fileUpload());
// Allow the app to accept JSON on req.body
app.use(express.json());

app.use("/uploads", express.static(__dirname + "/uploads"));
app.use("/resource", express.static(__dirname + "/resource"));

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});

app.use("/blog", blogRoute);
app.use("/listedlicense", listedLicenseRoute);
app.use("/spotify", spotifyRoute);
app.use("/soldlicense", soldLicenseRoute);
app.use("/offers", offerRoute);
app.use("/user", userRoute);
app.use("/notification", notificationRoute);
app.use("/report", reportRoute);
app.use("/public-sales-database", publicSalesRoute);
app.use("/license-checker", licenseCheckerRoute);
app.use("/social-linking", socialLinkingRoute);
app.use("/history", historyRoute);
app.use("/idenfy-callback", idenfyRoute);
app.use("/license-changes", licenseChangeRoute);
app.use("/security", SecurityRoute);

fs.mkdirsSync("./uploads/blogs");
fs.mkdirsSync("./resource/spotify");
// This endpoint is pinged every 5 mins by uptimerobot.com to prevent
// free services like Heroku and Now.sh from letting the app go to sleep.
// This endpoint is also pinged every time the client starts in the
// componentDidMount of App.js. Once the app is confirmed to be up, we allow
// the user to perform actions on the client.

// To get rid of all those semi-annoying Mongoose deprecation warnings.

const swaggerOptions = {
  definition: {
    openapi: "1.0.0",
    info: {
      title: "Nitrility Backend API with Swagger",
      version: "0.1.0",
      description: "Nitrility License marketplace API DOC",
      license: {
        name: "Nitrility",
        url: "https://nitrilityalpha.com",
      },
      contact: {
        name: "Nitrility",
        url: "https://nitrilityalpha.com",
        email: "james.liu.vectorspace@gmail.com",
      },
    },
    servers: [
      {
        url: SERVER_URL,
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

app.get("/wake-up", (req, res) => res.json("👌"));

// Catch all to handle all other requests that come into the app.
app.use("*", (req, res) => {
  res.status(404).json({ msg: "Not Found" });
});

// spotifyController.getDatabaseByRecordLabels();
reportController.cronJob();

// exec("migrate-mongo up", (error, stdout, stderr) => {
//   if (error) {
//     console.error(`Migration failed: ${error}`);
//     return;
//   }
//   console.log(`Migration successful: ${stdout}`);
// });

// The most likely reason connecting the database would error out is because
// Mongo has not been started in a separate terminal.
// Connecting the database and then starting the app.

io.on("connection", (socket) => {
  socket.on("read-notification", async (data) => {
    try {
      const { accountAddress, sellerId } = data;
      if (accountAddress) {
        let query = {
          $or: [
            ...(isSpotifyID(sellerId)
              ? [{ reader: { $regex: sellerId, $options: "i" } }]
              : []),
            { reader: { $regex: accountAddress, $options: "i" } },
          ],
          readed: false,
        };
        let notifications = await Notification.find(query).sort({
          createdAt: -1,
        });

        socket.emit("initial-notifications", {
          success: true,
          data: notifications,
          msg: "success",
        });
      } else {
        socket.emit("initial-notifications", {
          success: false,
          data: [],
          msg: "invalid account address",
        });
      }
    } catch (e) {
      console.log("error in fetching notification", e);
      socket.emit("initial-notifications", {
        success: false,
        data: [],
        msg: "something went wrong",
      });
    }
  });

  socket.on("disconnect", function () {
    console.log("social media disconnected");
  });
});

try {
  mongoose.connect(DB_URL, DB_OPTION, () =>
    server.listen(PORT, () => {
      console.log(`👍 server is running on ${DB_URL} : ${PORT}`);
      startIndexing();
    })
  );
} catch (e) {
  console.error("__error_serverJs", e);
}
