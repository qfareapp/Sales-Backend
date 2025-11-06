const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const SECRET_KEY = "texmaco_secret_key"; // change for production

// Preset credentials
const users = [
  { username: "sales_user", password: "sales123", role: "sales" },
  { username: "prod_user", password: "prod123", role: "production" },
  { username: "quality_user", password: "quality123", role: "quality" },
];

// Login endpoint
router.post("/login", (req, res) => {
     console.log("Incoming login:", req.body);
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // Generate token
  const token = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, {
    expiresIn: "8h",
  });

  res.json({
    success: true,
    message: "Login successful",
    token,
    role: user.role,
  });
});

module.exports = router;
