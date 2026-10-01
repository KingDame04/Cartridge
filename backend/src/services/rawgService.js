//Builds the Url for any game search query
const RAWG_BASE_URL =  "https://api.rawg.io/api";
const makeRawgRequest = async (endpoint, parameters = {}) => {
    if (!process.env.RAWG_API_KEY){
        throw new Error("RAWG_API_KEY is missing from the .env file");

    }
    const url = new URL(`${RAWG_BASE_URL}${endpoint}`);
    url.searchParams.set("key", process.env.RAWG_API_KEY);
    for (const [name, value] of Object.entries(parameters)){
        if (value !== undefined && value !== null && value !== ""){
            url.searchParams.set(name, value);
        }
    }
    const response = await fetch(url);
    if(!response.ok){
        throw new Error(
            `RAWG request failed with status ${response.status}`
        );
    }
    return response.json();
};
//Searches rawg games
const searchRawgGames = async (query, page = 1, pageSize = 20) => {
    return makeRawgRequest("/games", {
        search: query,
        page,
        page_size: pageSize
    });
};
//Gets rawg Game
const getRawgGame = async (rawgId) => {
    return makeRawgRequest(`/games/${rawgId}`);
};
module.exports = {
    searchRawgGames,
    getRawgGame
};