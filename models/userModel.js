const mongoose = require("mongoose");
const bcrypt = require("bcrypt")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,

    },
    password: {
        type: String,
        required: true,
        min: 8
    }
    /* ,
    email: {
        type: String,
        required: true,
        unique: [true, "This Email is already registered"],
        max: 40

    },
    isAvatarImageSet: {
        type: Boolean,
        default: false,

    },
    avatarInamge: {
        type: String,
        default: "",
    } */
    
},
{
    timestamps: true
}
);




userSchema.pre("save", async function(next) {
    if(!this.isModified("password")){
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt )

});


userSchema.methods.matchPassword = async function (enateredPassword) {
    return await bcrypt.compare(enateredPassword,this.password)
    
}




const User = mongoose.model("User", userSchema);

module.exports = User