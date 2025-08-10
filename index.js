// index.js
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const app = express();
const PORT = 3000;

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


// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Akash@raj552360",
  database: "student_portal"
});

db.connect(err => {
  if (err) throw err;
  console.log("MySQL Connected");
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
  const hashed = await bcrypt.hash(password, 10);
  db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed], err => {
    if (err) throw err;
    res.redirect("/login");
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) throw err;
    if (results.length > 0 && await bcrypt.compare(password, results[0].password)) {
      req.session.userId = results[0].id;
      res.redirect("/dashboard");
    } else {
      res.send("Invalid credentials");
    }
  });
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  db.query("SELECT * FROM subjects", (err, subjects) => {
    if (err) throw err;
    res.render("dashboard", { subjects });
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));