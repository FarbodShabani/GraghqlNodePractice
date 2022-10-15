const { validationResult } = require("express-validator");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signUp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (errors) {
      const error = new Error("there is something wrong with your data");
      error.statusCode = 422;
      error.data = errors.array();
    }
    const { name, password, email } = req.body;
    const hashPass = await bycrypt.hash(password, 12);
    const user = new User({
      name,
      password: hashPass,
      email,
    });
    const savedUser = await user.save();
    res.status(201).json({
      message: "user is successfully ",
      userId: savedUser._id,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("This user is not Authenticated");
      error.statusCode = 401;
      throw error;
    }
    const isEqual = await bycrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("The password is wrong");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id,
      },
      "thissecretistolongforFarbodandSaina",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "User Successfully logged in",
      userId: user._id.toString(),
      token,
    });
  } catch (err) {
    next(err);
  }
};
