const mongoose = require("mongoose");



const Schema = mongoose.Schema;



const postSchema = new Schema({
    title: {
        required: true,
        type: String,
    },
    content: {
        required: true,
        type: String,
    },
    imageUrl: {
        type: String,
        required: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {timestamps: true});



module.exports = mongoose.model("Post", postSchema);