// src/routes/rewards.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const adminAuth = require("../middleware/adminAuth");


// GET /rewards → Get all active rewards

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM rewards 
       WHERE active = TRUE 
       ORDER BY required_points ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get rewards error:", err);
    res.status(500).json({ error: err.message });
  }
});


// POST /rewards → Create a reward (admin only)

router.post("/", adminAuth, async (req, res) => {
  const { reward_name, description, required_points } = req.body;

  try {
    // Validate required fields
    if (!reward_name) {
      return res.status(400).json({ error: "Reward name is required" });
    }

    if (!required_points || required_points <= 0) {
      return res
        .status(400)
        .json({ error: "Required points must be greater than 0" });
    }

    await pool.query(
      `INSERT INTO rewards (reward_name, description, required_points, active)
       VALUES ($1, $2, $3, TRUE)`,
      [reward_name, description || "", required_points]
    );

    res.status(201).json({ message: "Reward created successfully" });
  } catch (err) {
    console.error("Create reward error:", err);
    res.status(500).json({ error: err.message });
  }
});


// PATCH /rewards/:reward_id → Update reward (admin only)

router.patch("/:reward_id", adminAuth, async (req, res) => {
  const { reward_id } = req.params;
  const { reward_name, description, required_points, active } = req.body;

  try {
    // Validate active if provided
    if (active !== undefined && typeof active !== "boolean") {
      return res.status(400).json({ error: "Active must be true or false" });
    }

    // Validate required_points if provided
    if (required_points !== undefined && required_points <= 0) {
      return res
        .status(400)
        .json({ error: "Required points must be greater than 0" });
    }

    // Check if reward exists
    const check = await pool.query(
      "SELECT * FROM rewards WHERE reward_id = $1",
      [reward_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Reward not found" });
    }

    // Update reward
    await pool.query(
      `UPDATE rewards
       SET reward_name = COALESCE($1, reward_name),
           description = COALESCE($2, description),
           required_points = COALESCE($3, required_points),
           active = COALESCE($4, active)
       WHERE reward_id = $5`,
      [reward_name, description, required_points, active, reward_id]
    );

    res.json({ message: "Reward updated successfully" });
  } catch (err) {
    console.error("Update reward error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
