const mongoose = require("mongoose");
const listFields = "_id name isPublic coverImage createdAt updatedAt";
const List = require("../models/list");
const GameUserEntry = require("../models/gameUserEntry");
const createList = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            name,
            isPublic = false,
            coverImage = null,
            entryIds = []
        } = req.body;

        if (typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                error: "A valid list name is required"
            });
        }

        if (!Array.isArray(entryIds)) {
            return res.status(400).json({
                error: "entryIds must be an array"
            });
        }

        const uniqueEntryIds = [
            ...new Set(entryIds.map(String))
        ];

        if (
            !uniqueEntryIds.every((entryId) =>
                mongoose.Types.ObjectId.isValid(entryId)
            )
        ) {
            return res.status(400).json({
                error: "One or more entry IDs are invalid"
            });
        }

        if (uniqueEntryIds.length > 0) {
            const matchingEntryCount =
                await GameUserEntry.countDocuments({
                    _id: {
                        $in: uniqueEntryIds
                    },
                    userId
                });

            if (
                matchingEntryCount !== uniqueEntryIds.length
            ) {
                return res.status(404).json({
                    error:
                        "One or more game entries were not found"
                });
            }
        }

        const list = await List.create({
            userId,
            name: name.trim(),
            isPublic,
            coverImage
        });

        if (uniqueEntryIds.length > 0) {
            await GameUserEntry.updateMany(
                {
                    _id: {
                        $in: uniqueEntryIds
                    },
                    userId
                },
                {
                    $addToSet: {
                        listIds: list._id
                    }
                }
            );
        }

        res.status(201).json({
            message: "List created successfully",
            list: {
                _id: list._id,
                name: list.name,
                isPublic: list.isPublic,
                coverImage: list.coverImage,
                createdAt: list.createdAt,
                updatedAt: list.updatedAt
            },
            assignedEntryIds: uniqueEntryIds
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

const getUserLists = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                error: "Invalid user ID"
            });
        }

        const lists = await List.find({
            userId
        }).select(listFields).sort({
            updatedAt: -1
        });

        res.status(200).json(lists);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

const deleteList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { listId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(listId)
        ) {
            return res.status(400).json({
                error: "Invalid user or list ID"
            });
        }

        const deletedList = await List.findOneAndDelete({
            _id: listId,
            userId
        });

        if (!deletedList) {
            return res.status(404).json({
                error: "List not found"
            });
        }
         await GameUserEntry.updateMany(
            {
                userId,
                listIds: listId
            },
            {
                $pull: {
                    listIds: listId
                }
            }
        );

        res.status(200).json({
            message: "List deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

const updateList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { listId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(listId)
        ) {
            return res.status(400).json({
                error: "Invalid user or list ID"
            });
        }

        const updates = {};

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "name"
            )
        ) {
            if (
                typeof req.body.name !== "string" ||
                req.body.name.trim() === ""
            ) {
                return res.status(400).json({
                    error: "A valid list name is required"
                });
            }

            updates.name = req.body.name.trim();
        }

        if (
            Object.prototype.hasOwnProperty.call(
                req.body,
                "coverImage"
            )
        ) {
            if (
                req.body.coverImage !== null &&
                typeof req.body.coverImage !== "string"
            ) {
                return res.status(400).json({
                    error:
                        "coverImage must be a string or null"
                });
            }

            updates.coverImage =
                req.body.coverImage === null
                    ? null
                    : req.body.coverImage.trim();
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error:
                    "Provide a name or coverImage to update"
            });
        }

        const updatedList = await List.findOneAndUpdate(
            {
                _id: listId,
                userId
            },
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        ).select(listFields); // No quotation marks

        if (!updatedList) {
            return res.status(404).json({
                error: "List not found"
            });
        }

        res.status(200).json({
            message: "List updated successfully",
            list: updatedList
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

module.exports = {
    createList,
    getUserLists,
    deleteList,
    updateList
};