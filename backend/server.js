require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./src/routes/auth");
const listRoutes = require("./src/routes/listRoutes");
const gameRoutes = require("./src/routes/gameRoutes");
const userGameEntryRoutes = require("./src/routes/userGameEntryRoutes");
const app = express();
// exposedHeaders: browsers hide all but a small default set of response
// headers from JS unless explicitly listed here — needed so the Flutter
// web build can read the sliding-session refreshed token (native mobile
// isn't subject to this restriction, but web is).
app.use(cors({ exposedHeaders: ['X-Refreshed-Token'] }));
// Allows your backend to read JSON request bodies
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// API routes
const apiRouter = express.Router();
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok" });
});


// Mount auth routes to API router
apiRouter.use("/auth", authRoutes);
apiRouter.use("/lists", listRoutes)
apiRouter.use("/games", gameRoutes);
apiRouter.use("/user-game-entries", userGameEntryRoutes);
app.use("/api", apiRouter);
// Connect to MongoDB and start listening — skipped when this file is
// require()'d (e.g. by auth.test.js importing `app`) rather than run directly,
// so tests can manage their own connection/lifecycle instead of opening a
// second one and binding the port.
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected");

      const PORT = process.env.PORT || 5000;

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });
}

module.exports = app;
