const mongoose = require ("mongoose");
const gameUserEntrySchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    gameId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Game",
        required: true
    },
    listIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "List"
        }
    ],
    played:{
        type: Boolean,
        default: false
    },
    hoursPlayed: {
        type: Number,
        default: 0,
        min : 0
    },
    rating:{
        type: Number,
        min: 0,
        max: 5
    },
    review:{
        type: String,
        trim: true
    },
    platformPlayed:{
        type: String,
        trim: true
    }
},
    {
        timestamps: true
    }
);
gameUserEntrySchema.index(
    {
        userId: 1,
        gameId: 1
    },
    {
        unique: true
    }
);
module.exports = mongoose.model("GameUserEntry", gameUserEntrySchema);