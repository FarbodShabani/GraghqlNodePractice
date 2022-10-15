const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    required: true,
    type: String,
  },
  name: {
    required: true,
    type: String,
  },
  password: {
    required: true,
    type: String,
  },
  status: {
    default: "I am new here!" ,
    type: String,
  },
  posts:[{
  type: Schema.Types.ObjectId,
  ref: 'Post',
  }],
});


module.exports = mongoose.model("User", userSchema);