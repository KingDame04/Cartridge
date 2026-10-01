const mongoose = require ("mongoose");
const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash:{
        type: String,
        required: true
    },
    profilePicture:{
        type: String
    },
    bio:{
        type: String,
        trim: true,
        default:""
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    verificationToken:{
        type: String
    },
    pendingEmail: {
        type: String,
        default: null
    },
    resetPasswordToken:{
        type: String
    },
    resetPasswordExpires:{
        type: Date
    },
    createdAt:{
        type: Date,
        default:Date.now
    }

   
});
module.exports = mongoose.model("User", userSchema);
