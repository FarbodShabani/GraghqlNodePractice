const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

// const io = require("../utils/socket.io");

const Post = require("../models/post");
const User = require("../models/user");


exports.getFeedPosts = async (req, res, next) => {
  const currentPage = req.query.currentPage || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({createdAt: -1})
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    if (posts.length == 0) {
      const error = new Error("couldn't find posts");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "posts fetch successfully",
      posts,
      totalItems,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFeedPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("server couldn't find the post");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "post fetch successfully",
      post,
    });
  } catch (err) {
    next(err);
  }
};

exports.createFeedPosts = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("there was error in submiting your post");
      error.statusCode = 422;
      throw error;
    }
    if (!req.file) {
      const err = new Error("there wasn't image for post");
      err.statusCode = 422;
      throw err;
    }
    const imageUrl = req.file.path.replace("\\", "/");
    const post = new Post({
      title,
      description,
      imageUrl,
      creator: req.userId,
    });
    await post.save();
    const user = await User.findById(req.userId);
    user.posts.push(post);
    const savedUser = await user.save();
    const populatePost = await post.populate("creator");
    io.getIo().emit("posts", {action: "create", post: populatePost});
    res.status(201).json({
      message: "successfully saved",
      post: populatePost,
      creator: {
        _id: savedUser._id,
        name: savedUser.name,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateFeedPosts = async (req, res, next) => {
  const { postId } = req.params;
  const { title, description } = req.body;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  const errorMessage = validationResult(req);
  try {
    if (!errorMessage.isEmpty()) {
      const error = new Error("there was problem in validation");
      error.statusCode = 422;
      error.errors = errorMessage.array();
      throw error;
    }
    if (!imageUrl) {
      const error = new Error("image file couldn't be found");
      error.statusCode = 422;
      throw error;
    }
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("post couldn't be found");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("not Authorized");
      error.statusCode = 401;
      throw error;
    }
    if (req.file) {
      deleteFile(post.imageUrl);
    }
    post.title = title;
    post.description = description;
    post.imageUrl = imageUrl;
    await post.save();
    const populatePost = await post.populate("creator");
    const user = User.findById(post.creator);
    io.getIo().emit("posts", {action: "update", post: populatePost})
    res.status(200).json({
      message: "successfully updated",
      post: populatePost,
      creator: {
        name: user.name,
        _id: req.userId,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteFeedPosts = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("post Not found");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("You are not Authorized to that");
      error.statusCode = 401;
      throw error;
    }
    deleteFile(post.imageUrl);
    await Post.findByIdAndDelete(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIo().emit("posts", {action: "delete", post: postId})
    res.status(200).json({ message: "post deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.deleteFile = (filePath) => {
  const unlinkPath = path.join(__dirname, "..", "images", filePath);
  return fs.unlink(unlinkPath, (err) =>
    console.log("error in deleteing: \n", err)
  );
};
