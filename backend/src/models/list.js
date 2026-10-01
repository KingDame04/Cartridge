const mongoose = require ("mongoose");
const listSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true
        }, 
        name: {
            type: String, 
            required: true, 
            trim: true
        }, 
        isPublic:{
            type: Boolean, 
            default: false
        }, 
        coverImage: {
            type: String,
            default: null,
            trim: true
        }
        },
        {
            timestamps: true
        }
    );
module.exports = mongoose.model("List", listSchema);
