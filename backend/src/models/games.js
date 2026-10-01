const mongoose = require ("mongoose");
const gameSchema = new mongoose.Schema({
    rawgId: {
        type: Number,
    },
      source: {
        type: String,
        enum: ["rawg", "manual"],
        default: "rawg"
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    coverImage: {
        type: String
    },
    genres:{
        type:[String],
        default:[]
    },
    platforms:{
        type:[String],
        default: []
    },
    releaseDate: {
        type: Date
    },
    developers: {
        type: [String],
        default: []
    },
    description:{
        type: String
    },
    cachedAt: {
        type: Date,
        default: Date.now
    }
});
gameSchema.index(
    { rawgId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            rawgId: { $type: "number" }
        }
    }
);
module.exports = mongoose.model("Game", gameSchema);