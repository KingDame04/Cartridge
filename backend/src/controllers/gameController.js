const Game = require ("../models/games");
const fullGameFields = "_id rawgId name coverImage genres platforms releaseDate developers description cachedAt";
const {
    searchRawgGames,
    getRawgGame
} = require("../services/rawgService");
const formatGame = (rawgGame) => {
    return {
        rawgId: rawgGame.id,
        name: rawgGame.name,
        coverImage: rawgGame.background_image || null,
        genres:
            rawgGame.genres?.map((genre) => genre.name) || [],
        platforms:
            rawgGame.platforms?.map(
                (item) => item.platform.name
            ) || [],
        releaseDate: rawgGame.released || null,
        developers:
            rawgGame.developers?.map(
                (developer) => developer.name
            ) || [],

        description:
            rawgGame.description_raw ||
            rawgGame.description ||
            "",

        cachedAt: new Date()
    };
};

const searchGames = async (req, res) => {
    try{
        const query = req.query.search;
        if (!query || query.trim() === "")
        {
            return res.status(400).json({
                error: "A search term is required"
            });
        }
        const page = Number(req.query.page) || 1;
        const pageSize = Number(req.query.pageSize) || 20;
        const data = await (searchRawgGames)(
            query.trim(),
            page,
            pageSize
        );
        const games = data.results.map((rawgGame)=>{
            return formatGame(rawgGame);
        });
        res.status(200).json({
            count: data.count,
            next: data.next,
            previous: data.previous,
            results: games
        });
    } catch(error){
        res.status(500).json({
            error: error.message
        });
    }
};

const getGameByRawgId = async (req, res) => {
    try{
        const rawgId = Number(req.params.rawgId)
        if(!Number.isInteger(rawgId)||rawgId<=0){
            return res.status(400).json({
                error: "Invalid RAWG game ID"
            });
        }
        const rawgGame = await getRawgGame(rawgId);
        const game = formatGame(rawgGame);
        res.status(200).json(game);
    }catch(error){
        res.status(500).json({
            error: error.message
        });
    }
};
const saveGame = async (req, res) => {
    try {
        const rawgId = Number(req.params.rawgId);
        if(!Number.isInteger(rawgId)||rawgId<=0){
            return res.status(400).json({
                error: "Invalid RAWG game ID"
            });
        }
        const rawgGame = await getRawgGame(rawgId);
        const gameData = formatGame(rawgGame);
        const game = await Game.findOneAndUpdate(
            {
                rawgId: gameData.rawgId
            },
            {
                $set: gameData
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        ).select(fullGameFields);
        res.status(200).json({
            message: "Game saved successfully",
            game
        });
    } catch(error){
        res.status(500).json({
            error: error.message
        });
    }
};
const getSavedGame = async (req, res) => {
    try{
        const game = await Game.findById(req.params.gameId).select(fullGameFields);
        if(!game)
        {
            return res.status(400).json({
                error: "Game not Found"
            });
        }
        res.status(200).json(game);
    }catch(error){
        res.status(500).json({
            error: error.message
        });
    }
};
const createManualGame = async (req, res) => {
    try {
        const userId = req.user.userId;

        const {
            name,
            coverImage,
            genres,
            platforms,
            releaseDate,
            developers,
            description
        } = req.body;

        if (typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                error: "A valid game name is required"
            });
        }

        if (genres !== undefined && !Array.isArray(genres)) {
            return res.status(400).json({
                error: "genres must be an array"
            });
        }

        if (
            platforms !== undefined &&
            !Array.isArray(platforms)
        ) {
            return res.status(400).json({
                error: "platforms must be an array"
            });
        }

        if (
            developers !== undefined &&
            !Array.isArray(developers)
        ) {
            return res.status(400).json({
                error: "developers must be an array"
            });
        }

        const game = await Game.create({
            source: "manual",
            createdBy: userId,
            name: name.trim(),
            coverImage: coverImage || null,
            genres: genres || [],
            platforms: platforms || [],
            releaseDate: releaseDate || null,
            developers: developers || [],
            description: description || ""
        });

        res.status(201).json({
            message: "Manual game created successfully",
            game: {
                _id: game._id,
                source: game.source,
                name: game.name,
                coverImage: game.coverImage,
                genres: game.genres,
                platforms: game.platforms,
                releaseDate: game.releaseDate,
                developers: game.developers,
                description: game.description
            }
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};
module.exports = {
    searchGames,
    getGameByRawgId,
    saveGame,
    getSavedGame,
    createManualGame
};