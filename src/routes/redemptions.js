const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const auth = require("../middleware/auth");


// POST /redemptions → Redeem a reward

router.post("/", auth, async (req, res) => {
  const { reward_id } = req.body;
  const user_id = req.user.user_id;

  try {
    // Validate reward_id
    if (!reward_id || isNaN(reward_id)) {
      return res.status(400).json({ error: "Valid reward_id is required" });
    }

    // 1. Check user exists
    const userResult = await pool.query(
      `SELECT total_points FROM users WHERE user_id = $1`,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const userPoints = userResult.rows[0].total_points;

    // 2. Check reward exists and is active
    const rewardResult = await pool.query(
      `SELECT required_points 
       FROM rewards 
       WHERE reward_id = $1 AND active = TRUE`,
      [reward_id]
    );

    if (rewardResult.rows.length === 0) {
      return res.status(400).json({ error: "Reward not found or inactive" });
    }

    const requiredPoints = rewardResult.rows[0].required_points;

    // 3. Check if user has enough points
    if (userPoints < requiredPoints) {
      return res.status(400).json({ error: "Not enough points" });
    }

    // 4. Insert redemption record
    await pool.query(
      `INSERT INTO redemptions (user_id, reward_id, redeemed_at)
       VALUES ($1, $2, NOW())`,
      [user_id, reward_id]
    );

    // 5. Deduct points from user
    await pool.query(
      `UPDATE users
       SET total_points = total_points - $1
       WHERE user_id = $2`,
      [requiredPoints, user_id]
    );

    res.json({
      message: "Reward redeemed successfully",
      points_deducted: requiredPoints,
    });
  } catch (err) {
    console.error("Redemption error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET /redemptions/:user_id → Get user's redemption history

router.get("/:user_id", auth, async (req, res) => {
  const user_id = parseInt(req.params.user_id);

  // Validate user_id
  if (isNaN(user_id)) {
    return res.status(400).json({ error: "Invalid user_id" });
  }

  // Access control
  if (req.user.user_id !== user_id) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const result = await pool.query(
      `SELECT r.redemption_id, rw.reward_name, rw.required_points, r.redeemed_at
       FROM redemptions r
       JOIN rewards rw ON r.reward_id = rw.reward_id
       WHERE r.user_id = $1
       ORDER BY r.redeemed_at DESC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get redemptions error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
