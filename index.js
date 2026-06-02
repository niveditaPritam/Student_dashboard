// index.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Models
const User = require('./models/User');
const Subject = require('./models/Subject');

const cors = require("cors");
app.use(cors());

//api

const askGemini = require("./chat");


app.use(express.json());

// START: Updated /ask route to handle language
app.post("/ask", async (req, res) => {
  const { question, language } = req.body;
  
  // Create a more contextual prompt for the AI
  const prompt = `Please provide a helpful and accurate response in ${language} for the following question: "${question}"`;

  const reply = await askGemini(prompt);
  res.json({ reply });
});
// END: Updated /ask route

app.use(express.json());


// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_portal';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: false
}));

// Auth Middleware
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/login");
}

// Routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Prevent duplicate registrations
    const existing = await User.findOne({ email }).exec();
    if (existing) return res.status(400).send('Email already registered');

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error registering user');
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).exec();
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect("/dashboard");
    } else {
      res.send("Invalid credentials");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Login error');
  }
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
  try {
    const subjects = await Subject.find().exec();
    res.render("dashboard", { subjects });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

// Subject creation routes
app.get('/subjects/new', isAuthenticated, (req, res) => {
  res.render('add_subject');
});

app.post('/subjects', isAuthenticated, async (req, res) => {
  const { name, description, notes_url, video_url } = req.body;
  try {
    const s = new Subject({ name, description, notes_url, video_url });
    await s.save();
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating subject');
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));