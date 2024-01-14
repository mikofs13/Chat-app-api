const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js")
const jwt = require("jsonwebtoken")




module.exports = {
    registerUser
}