const express = require("express");
const router = express.Router();
const {authenticateToken} = require(
    "../middleware/tokenVerification"
);
const{
    searchGames,
    getGameByRawgId,
    saveGame,
    getSavedGame,
    createManualGame
} = require ("../controllers/gameController");

router.get("/search", searchGames);
router.get("/rawg/:rawgId", getGameByRawgId);
router.post("/rawg/:rawgId", authenticateToken, saveGame);
router.get("/:gameId", getSavedGame);
router.post("/manual",authenticateToken,createManualGame);

module.exports = router;