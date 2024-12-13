const express = require("express");
const session = require("express-session");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const axios = require("axios");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, "credentials/.env") });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
const USERNAME = process.env.MONGO_DB_USERNAME;
const PASSWORD = process.env.MONGO_DB_PASSWORD;
const uri = `mongodb+srv://${USERNAME}:${PASSWORD}@cluster0.4kgcu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const databaseAndCollection = {
  db: process.env.MONGO_DB_NAME,
  collection: process.env.MONGO_COLLECTION,
};
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
client.connect().then(() => console.log("MongoDB connected"));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));

async function insertUser(user) {
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(user);
  console.log(result);
  return result;
}

async function queryUser(username) {
  const filter = { username: username };
  const result = await client
    .db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .findOne(filter);
  console.log(result);
  return result;
}

// Routes
app.get("/", (req, res) => {
  res.render("login", {
    title: "Login",
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await queryUser(username);

    if (!user || user.password !== password) {
      return res
        .status(401)
        .send('Incorrect password. Please try again. <a href="/">Go back</a>');
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      highScore: user.highScore,
    };
    req.session.save();
    res.redirect("/home");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send("Internal server error. Please try again later.");
  }
});

app.get("/register", (req, res) => {
  res.render("register", {
    title: "Register",
  });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    let user = await queryUser(username);

    if (user) {
      return res
        .status(401)
        .send('User already exists. Please try again. <a href="/register">Go back</a>');
    }
    user = {
      username: username,
      password: password,
      highScore: 0,
    };
    const result = await insertUser(user);
    user._id = result.insertedId;

    req.session.user = {
      id: user._id,
      username: user.username,
      highScore: user.highScore,
    };
    req.session.save();
    res.redirect("/home");
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send("Internal server error. Please try again later.");
  }
});

app.get("/home", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.render("home", {
    title: "Home",
    username: req.session.user.username,
    highScore: req.session.user.highScore,
  });
});

app.get("/game", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.render("game", {
    title: "Game",
    highScore: req.session.user.highScore,
  });
});

app.get("/leaderboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.render("leaderboard", {
    title: "Leaderboard",
  });
});

app.get("/logout", (req, res) => {
  res.render("login", {
    title: "Login",
  });
});

// API
async function fetchValidAnime() {
  let anime = null;

  while (
    !anime ||
    anime.image === null ||
    anime.score === null ||
    anime.rating[0] === "R"
  ) {
    const response = await axios.get("https://api.jikan.moe/v4/random/anime");
    anime = {
      title: response.data.data.title_english || response.data.data.title,
      image: response.data.data.images.jpg.image_url,
      score: response.data.data.score,
      rating: response.data.data.rating || " ",
    };
  }

  return anime;
}

app.get("/api/anime", async (req, res) => {
  try {
    const anime1 = await fetchValidAnime();
    const anime2 = await fetchValidAnime();

    res.json({ anime1, anime2 });
  } catch (error) {
    console.error("Error fetching anime data:", error);
    res.status(500).json({ error: "Failed to fetch anime data" });
  }
});

app.post("/update-score", async (req, res) => {
  const { score } = req.body;

  if (!req.session.user) {
    return res.status(401).send("Unauthorized. Please log in.");
  }
  try {
    if (score > req.session.user.highScore) {
      req.session.user.highScore = score;
      await client
        .db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .updateOne(
          { _id: new ObjectId(req.session.user.id) },
          { $set: { highScore: score } }
        );
      res.json({ message: "High score updated!", highScore: score });
    } else {
      res.json({
        message: "No new high score",
        highScore: req.session.user.highScore,
      });
    }
  } catch (error) {
    console.error("Error updating high score:", error);
    res.status(500).send("Internal server error.");
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboard = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find({})
      .sort({ highScore: -1 })
      .toArray();
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});