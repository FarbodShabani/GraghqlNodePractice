const path = require("path");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { v4 : uuidv4 } = require('uuid');
const {graphqlHTTP} = require("express-graphql");

const auth = require("./middlewares/auth");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolver");
const { deleteFile } = require("./controller/feed");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4());
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg" || file.mimetype === "image/png") {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

app.use(bodyParser.json());
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(multer({storage: fileStorage, fileFilter}).single("image"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, delete, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200)
  }
  next();
});

app.use(auth);

app.use("/upload-image", (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("user is not Authenticated");
    error.code = 401;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No file found");
    error.code = 404;
    throw error;
  }
  if (req.body.oldPath) {
   deleteFile(req.body.oldPath)
  }
  return res.status(201).json({message: "File stored!", filePath: req.file.path});
})

app.use("/graphql", graphqlHTTP({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  customFormatErrorFn(err) {
    if (!err.originalError) {
      return err;
    }
    const status = err.originalError.code || 500;
    const message = err.originalError.message || "something went wrong";
    const errors = err.originalError.data;
    return {
      status,
      message,
      errors
    }
  }
}))


app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data || [];
    res.status(status).json({message, data});
});

mongoose
  .connect(
    "mongodb://localhost:27017/Messenger"
  )
  .then(() => app.listen("2828"))
  .catch((err) => console.log("error in connecting to data base: \n", err));
