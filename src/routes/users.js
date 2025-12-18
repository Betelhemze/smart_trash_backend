const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register User
router.post("/register", async (req, res) => {
  const { full_name, username, phone_hash } = req.body;

  try {
    // Hash phone number
    const hashedPhone = await bcrypt.hash(phone_hash, 10);

    // Insert user
    await pool.query(
      `INSERT INTO users (full_name, username, phone_hash)
       VALUES ($1, $2, $3)`,
      [full_name, username, hashedPhone]
    );

    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Login User
router.post("/login", async (req, res) => {
  const { username, phone_hash } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    const user = result.row[0];
    if (!user) return res.status(400).json({ error: "User not found" });

    // Compare phone number
    const valid = await bcrypt.compare(phone_hash, user.phone_hash); // assuming phone_hash as password for now
    if (!valid) return res.status(400).json({ error: "Invalid phone number" });

    // Create JWT token
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, is_admin: user.is_admin },
      "your_secret_key",
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get User Info
router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query (`
      SELECT user_id, full_name, username, total_points, created_at
      FROM users
      WHERE user_id = $1
    `, [userId]);
    if (!result.row.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(result.row[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
