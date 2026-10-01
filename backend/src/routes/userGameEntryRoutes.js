const express = require("express");
const router = express.Router();

const {authenticateToken} = require(
    "../middleware/tokenVerification"
);
const {
    addGameToUserList,
    removeGameFromUserList,
    getUserCollection,
    getGameEntry,
    updateGameEntry,
    createGameEntry,
    deleteGameEntry
} = require("../controllers/gameUserEntryController");
// Every route below this line requires a valid JWT
router.use(authenticateToken);
router.post("/", createGameEntry);
// Get the authenticated user's entire game collection
router.get(
    "/collection",
    getUserCollection
);

// Get one entry from the authenticated user's collection
router.get(
    "/collection/:entryId",
    getGameEntry
);

// Update one entry
router.patch(
    "/collection/:entryId",
    updateGameEntry
);
router.delete("/:entryId", deleteGameEntry);

// Add a saved game to one of the user's lists
router.post(
    "/lists/:listId/games/:gameId",
    addGameToUserList
);

// Remove a saved game from one of the user's lists
router.delete(
    "/lists/:listId/games/:gameId",
    removeGameFromUserList
);

module.exports = router;