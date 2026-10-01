const mongoose = require("mongoose");
const List = require("../models/list");
const Game = require("../models/games");
const GameUserEntry = require("../models/gameUserEntry");
const gameSummaryFields =  "_id name coverImage genres platforms releaseDate developers";
const gameFields = "name coverImage genres releaseDate developers";
const entryFields = "_id gameId listIds played hoursPlayed rating review platformPlayed createdAt updatedAt";
const validIds = (...ids) => {
    return ids.every((id)=>
    mongoose.Types.ObjectId.isValid(id)
    );
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_STAGES = {
    date_desc: { createdAt: -1 },
    date_asc: { createdAt: 1 },
    title_asc: { "game.name": 1 },
    title_desc: { "game.name": -1 },
    dev_asc: { primaryDeveloper: 1 },
    dev_desc: { primaryDeveloper: -1 },
    rate_desc: { rating: -1 },
    rate_asc: { rating: 1 }
};

const splitParam = (value) =>
    (value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const addGameToUserList = async (req, res) =>{
    try{
        const userId = req.user.userId;
        const {listId, gameId} = req.params;
        if (!validIds(userId, listId, gameId)){
            return res.status(400).json({
                error: "Invalid user, list, or game ID"
            });
        }
        const listExists = await List.exists({
            _id: listId,
            userId
        });
        if(!listExists) {
            return res.status(404).json({
                error: "List not found for this user"
            });
        }
        const gameExists = await Game.exists({
            _id: gameId
        });
        if (!gameExists) {
            return res.status(404).json({
                error: "Game not found"
            });
        }
        const entry = await GameUserEntry.findOneAndUpdate(
            {
                userId,
                gameId
            },
            {
                $setOnInsert: {
                    userId,
                    gameId
                },
                $addToSet: {
                    listIds: listId
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        ).select(entryFields).populate({
    path: "gameId",
    select: gameSummaryFields
});
        res.status(200).json({
            message: "Game added to list successfully",
            entry
        });
    } catch (error){
        res.status(500).json({
            error: error.message
        });
    }
};
const removeGameFromUserList = async (req, res) =>{
    try{
        const userId = req.user.userId;
        const {listId, gameId} = req.params;
        if (!validIds(userId, listId, gameId)){
            return res.status(400).json({
                error: "Invalid user, list, or game ID"
            });
        }
        const listExists = await List.exists({
            _id: listId,
            userId
        });
        if(!listExists) {
            return res.status(404).json({
                error: "List not found for this user"
            });
        }
          const entry = await GameUserEntry.findOneAndUpdate(
            {
                userId,
                gameId,
                listIds: listId
            },
            {
                $pull: {
                    listIds: listId
                }
            },
            {
                new: true,
                runValidators: true
            }
        ).select(entryFields).populate({
    path: "gameId",
    select: gameSummaryFields
});
          if (!entry) {
            return res.status(404).json({
                error: "Game was not found in this list"
            });
        }

        res.status(200).json({
            message: "Game removed from list successfully",
            entry
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
const getUserCollection = async (req, res) => {
    try {
        // The user ID comes from tokenVerification
        const userId = req.user.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                error: "Invalid user ID"
            });
        }

        const {
            page,
            limit,
            search,
            listIds,
            played,
            yearMin,
            yearMax,
            developers,
            genres,
            sort
        } = req.query;

        // Pagination is opt-in via page/limit — callers that don't ask for it
        // (the mobile app, which does its own client-side rendering over the
        // full collection) get the exact same unpaginated array response as
        // before, untouched.
        const wantsPagination = page !== undefined || limit !== undefined;

        if (!wantsPagination) {
            const entries = await GameUserEntry.find({
                userId
            }).select(entryFields).populate({
                path: "gameId",
                select: gameSummaryFields
            });

            return res.status(200).json(entries);
        }

        const pageNumber = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNumber - 1) * pageSize;

        const selectedListIds = splitParam(listIds)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));
        const selectedDevelopers = splitParam(developers);
        const selectedGenres = splitParam(genres);

        const parsedYearMin = yearMin ? parseInt(yearMin, 10) : null;
        const parsedYearMax = yearMax ? parseInt(yearMax, 10) : null;

        const filterStages = [];
        const searchTerm = (search || "").trim();

        if (searchTerm) {
            const searchPattern = new RegExp(escapeRegex(searchTerm), "i");
            filterStages.push({
                $match: {
                    $or: [
                        { "game.name": searchPattern },
                        { "game.developers": searchPattern },
                        { "game.genres": searchPattern },
                        { platformPlayed: searchPattern },
                        { review: searchPattern }
                    ]
                }
            });
        }

        if (selectedListIds.length > 0) {
            filterStages.push({ $match: { listIds: { $in: selectedListIds } } });
        }

        if (played === "true") {
            filterStages.push({ $match: { played: true } });
        } else if (played === "false") {
            filterStages.push({ $match: { played: { $ne: true } } });
        }

        if (parsedYearMin || parsedYearMax) {
            const yearConditions = [];
            if (parsedYearMin) {
                yearConditions.push({ $gte: [{ $year: "$game.releaseDate" }, parsedYearMin] });
            }
            if (parsedYearMax) {
                yearConditions.push({ $lte: [{ $year: "$game.releaseDate" }, parsedYearMax] });
            }
            filterStages.push({
                $match: {
                    "game.releaseDate": { $type: "date" },
                    $expr: yearConditions.length > 1 ? { $and: yearConditions } : yearConditions[0]
                }
            });
        }

        if (selectedDevelopers.length > 0) {
            filterStages.push({ $match: { "game.developers": { $in: selectedDevelopers } } });
        }

        if (selectedGenres.length > 0) {
            filterStages.push({ $match: { "game.genres": { $in: selectedGenres } } });
        }

        const sortStage = SORT_STAGES[sort] || SORT_STAGES.date_desc;

        const pipeline = [
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "games",
                    localField: "gameId",
                    foreignField: "_id",
                    as: "game"
                }
            },
            { $unwind: "$game" },
            {
                $addFields: {
                    primaryDeveloper: {
                        $ifNull: [{ $arrayElemAt: ["$game.developers", 0] }, ""]
                    }
                }
            },
            {
                // developers/genres reflect the whole collection regardless of
                // the filters below, so the sidebar can always show every
                // option — only entries/totalCount are actually filtered.
                // (Mongo doesn't allow nesting $facet inside $facet, so
                // entries/totalCount each re-apply filterStages independently
                // as siblings instead of sharing a nested sub-pipeline.)
                $facet: {
                    developers: [
                        { $unwind: "$game.developers" },
                        { $group: { _id: "$game.developers" } },
                        { $sort: { _id: 1 } }
                    ],
                    genres: [
                        { $unwind: "$game.genres" },
                        { $group: { _id: "$game.genres" } },
                        { $sort: { _id: 1 } }
                    ],
                    entries: [
                        ...filterStages,
                        { $sort: sortStage },
                        { $skip: skip },
                        { $limit: pageSize }
                    ],
                    totalCount: [
                        ...filterStages,
                        { $count: "count" }
                    ]
                }
            }
        ];

        const [facetResult] = await GameUserEntry.aggregate(pipeline);

        const rawEntries = facetResult.entries || [];
        const totalCount = facetResult.totalCount[0]?.count || 0;

        const entries = rawEntries.map((doc) => ({
            _id: doc._id,
            gameId: {
                _id: doc.game._id,
                name: doc.game.name,
                coverImage: doc.game.coverImage,
                genres: doc.game.genres,
                platforms: doc.game.platforms,
                releaseDate: doc.game.releaseDate,
                developers: doc.game.developers
            },
            listIds: doc.listIds,
            played: doc.played,
            hoursPlayed: doc.hoursPlayed,
            rating: doc.rating,
            review: doc.review,
            platformPlayed: doc.platformPlayed,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        }));

        res.status(200).json({
            entries,
            page: pageNumber,
            pageSize,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
            filterOptions: {
                developers: facetResult.developers.map((entry) => entry._id),
                genres: facetResult.genres.map((entry) => entry._id)
            }
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
const getGameEntry = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { entryId } = req.params;

        if (!validIds(userId, entryId)) {
            return res.status(400).json({
                error: "Invalid user or entry ID"
            });
        }

        const entry = await GameUserEntry.findOne({
            _id: entryId,
            userId
        }).select(entryFields).populate({
            path: "gameId",
            select: gameSummaryFields
        });

        if (!entry) {
            return res.status(404).json({
                error: "Game entry not found"
            });
        }

        res.status(200).json(entry);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
const updateGameEntry = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { entryId } = req.params;

        if (!validIds(userId, entryId)) {
            return res.status(400).json({
                error: "Invalid user or entry ID"
            });
        }

        const allowedFields = [
            "played",
            "hoursPlayed",
            "rating",
            "review",
            "platformPlayed"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(
                    req.body,
                    field
                )
            ) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: "No valid fields were provided"
            });
        }

        const entry = await GameUserEntry.findOneAndUpdate(
            {
                _id: entryId,
                userId
            },
            {
                $set: updates
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        ).populate({
            path: "gameId",
            select: "name coverImage genres releaseDate developers"
        });

        if (!entry) {
            return res.status(404).json({
                error: "Game entry not found"
            });
        }

        res.status(200).json({
            message: "Game entry updated successfully",
            entry
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
const createGameEntry = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            gameId,
            listIds = [],
            played,
            hoursPlayed,
            rating,
            review,
            platformPlayed
        } = req.body;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(gameId)
        ) {
            return res.status(400).json({
                error: "Invalid user or game ID"
            });
        }

        if (!Array.isArray(listIds)) {
            return res.status(400).json({
                error: "listIds must be an array"
            });
        }

        const uniqueListIds = [
            ...new Set(listIds.map(String))
        ];

        if (!validIds(...uniqueListIds)) {
            return res.status(400).json({
                error: "One or more list IDs are invalid"
            });
        }

        const gameExists = await Game.exists({
            _id: gameId
        });

        if (!gameExists) {
            return res.status(404).json({
                error: "Game not found"
            });
        }

        if (uniqueListIds.length > 0) {
            const matchingListCount =
                await List.countDocuments({
                    _id: {
                        $in: uniqueListIds
                    },
                    userId
                });

            if (
                matchingListCount !== uniqueListIds.length
            ) {
                return res.status(404).json({
                    error:
                        "One or more lists were not found"
                });
            }
        }

        const existingEntry =
            await GameUserEntry.findOne({
                userId,
                gameId
            });

        if (existingEntry) {
            return res.status(409).json({
                error:
                    "This game is already in the user's collection",
                entryId: existingEntry._id
            });
        }

        const entry = await GameUserEntry.create({
            userId,
            gameId,
            listIds: uniqueListIds,
            played,
            hoursPlayed,
            rating,
            review,
            platformPlayed
        });

        await entry.populate({
            path: "gameId",
            select: gameFields
        });

        res.status(201).json({
            message: "Game entry created successfully",
            entry
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                error: error.message
            });
        }

        res.status(500).json({
            error: error.message
        });
    }
};
const deleteGameEntry = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { entryId } = req.params;

        if (!validIds(userId, entryId)) {
            return res.status(400).json({
                error: "Invalid user or entry ID"
            });
        }

        const deletedEntry =
            await GameUserEntry.findOneAndDelete({
                _id: entryId,
                userId
            });

        if (!deletedEntry) {
            return res.status(404).json({
                error: "Game entry not found"
            });
        }

        res.status(200).json({
            message:
                "Game removed from collection successfully",
            entryId: deletedEntry._id
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
module.exports = {
    addGameToUserList,
    removeGameFromUserList,
    getUserCollection,
    getGameEntry,
    updateGameEntry,
    createGameEntry,
    deleteGameEntry
};