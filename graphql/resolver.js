const User = require("../models/user");
const bycrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const Post = require("../models/post");
const { deleteFile } = require("../controller/feed");

module.exports = {
  createUser: async ({ userInput }, req) => {
    const { email, name, password } = userInput;
    const errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: "Email is wrong" });
    }
    if (!validator.isLength(password, { min: 5 })) {
      errors.push({ message: "password is to short" });
    }
    if (errors.length > 0) {
      const error = new Error("unvalid input!!");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existedUser = await User.findOne({ email });
    if (existedUser) {
      const error = new Error("user is already exist");
      throw error;
    }
    const hashPassword = await bycrypt.hash(password, 12);
    const newUser = new User({ email, name, password: hashPassword });
    const savedUser = await newUser.save();
    return { ...savedUser._doc, _id: savedUser._doc._id.toString() };
  },
  login: async ({ loginInput }, req) => {
    const { email, password } = loginInput;
    const userExist = await User.findOne({ email });
    if (!userExist) {
      const error = new Error("This User doesn't exist!!");
      error.code = 401;
      throw error;
    }
    const rightPassword = await bycrypt.compare(password, userExist.password);
    if (!rightPassword) {
      const error = new Error("There is problem with your password");
      error.code = 401;
      throw error;
    }
    const token = await jwt.sign(
      {
        userId: userExist._id.toString(),
        email: userExist.email,
      },
      "THereIsAlotofSeceretBetweenMeandHerAndbyNEAndHerImeanSainaAndFarbod"
    );
    return {
      token,
      userId: userExist._id.toString(),
    };
  },
  createPost: async ({ postInput }, req) => {
    if (!req.isAuth) {
      const error = new Error("User is not Authenticated !!");
      error.code = 401;
      throw error;
    }
    const { title, content, imageUrl } = postInput;
    const errors = [];
    if (!validator.isLength(title, { min: 5 })) {
      errors.push({ message: "title is to short!!" });
    }
    if (!validator.isLength(content, { min: 5 })) {
      errors.push({ message: "title is to short!!" });
    }
    if (errors.length > 0) {
      const error = new Error("inputs values are Invalid");
      error.code = 422;
      error.data = errors;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User is not registered");
      error.code = 401;
      throw error;
    }
    const newPost = new Post({ title, content, imageUrl, creator: user });
    const createdPost = await newPost.save();
    user.posts.push(newPost);
    await user.save();
    // console.log("Post created: \n", createdPost._doc.createAt);
    return {
      ...createdPost._doc,
      _id: createdPost._doc._id.toString(),
      createdAt: createdPost._doc.createdAt.toISOString(),
      updatedAt: createdPost._doc.updatedAt.toISOString(),
    };
  },
  getPosts: async ({ currentPage }, req) => {
    if (!req.isAuth) {
      const error = new Error("user is not Authenticated");
      error.code = 401;
      throw error;
    }
    const perPage = 2;
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    if (!(posts.length > 0)) {
      const error = new Error("No Post found!!");
      error.code = 404;
      throw error;
    }
    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._doc._id.toString(),
          createdAt: post._doc.createdAt.toISOString(),
          updatedAt: post._doc.updatedAt.toISOString(),
        };
      }),
      totalItems,
    };
  },
  getPost: async ({ postId }, req) => {
    if (!req.isAuth) {
      const error = new Error("use is not Authenticated!!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("Post not found");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._doc._id.toString(),
      createdAt: post._doc.createdAt.toISOString(),
      updatedAt: post._doc.updatedAt.toISOString(),
    };
  },
  updatePost: async ({postId, postInput}, req) => {
    if (!req.isAuth) {
      const error = new Error("Not Authorized");
      error.code = 401;
      throw error;
    }
    const {title, content, imageUrl} = postInput;
    const errors = [];
    if (!validator.isLength(title, { min: 5 })) {
      errors.push({ message: "title is to short!!" });
    }
    if (!validator.isLength(content, { min: 5 })) {
      errors.push({ message: "title is to short!!" });
    }
    if (errors.length > 0) {
      const error = new Error("inputs values are Invalid");
      error.code = 422;
      error.data = errors;
      throw error;
    }
    const post = await Post.findById(postId).populate("creator");
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not Authorized!!!");
      error.code = 401;
      throw error;
    }
    post.title = title;
    post.content = content;
    if (imageUrl !== undefined) {
      post.imageUrl = imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      _id: updatedPost._doc._id,
      createdAt: updatedPost._doc.createdAt.toISOString(),
      updatedAt: updatedPost._doc.updatedAt.toISOString(),
    };
  },
  deletePost: async ({postId}, req) => {
    if (!req.isAuth) {
      const error = new Error("Not Authorized !!!");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(postId);
    if(!post) {
      const error = new Error("post not found");
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not Authorized!!");
      error.code = 403;
      throw error;
    }
    deleteFile(post.imageUrl);
    await Post.findByIdAndDelete(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save()
    return true; 
  },
  updateStatus: async ({status}, req) => {
    if (!req.isAuth) {
      const error = new Error("Not Authorized!!!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("user not found!!");
      error.code = 404;
      throw error;
    }
    user.status = status;
    await user.save();
    return true;
  },
  user: async (e,req) => {
    console.log("req: \n", req);
    if (!req.isAuth) {
      const error = new Error("Not Authorized!!!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("user not found!!");
      error.code = 404;
      throw error;
    }
    return {...user._doc, _id: user._doc._id.toString()} ;
  }
};
