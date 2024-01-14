const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        

    },
    recipient: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        

    },
    text: {
        type: String
    }
}, {
    timestamps: true
})


const Message = mongoose.model("Message", messageSchema);

module.exports = Message