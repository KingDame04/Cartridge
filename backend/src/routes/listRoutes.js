const express = require("express");
const router = express.Router();
const {authenticateToken} = require("../middleware/tokenVerification");

const{
    createList,
    getUserLists,
    deleteList,
    updateList
} = require("../controllers/listController");
router.use(authenticateToken);
router.post("/", createList);
router.get("/", getUserLists);
router.delete("/:listId", deleteList);
router.patch("/:listId", updateList);
router.put("/:listId", updateList);
module.exports = router;