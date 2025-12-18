const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const auth = require("../middleware/auth");

// Helper function to calculate points based on trash type
const calculatePoints = (trash_type, item_count) => {
  const pointsMap = {
    metal: 5,
    wet: 2,
    dry: 3,
    plastic: 4,
  };
  return (pointsMap[trash_type] || 1) * item_count;
};

// POST /trashdrops → Record a new trash drop
router.post("/", auth, async (req, res) => {
  const { bin_id, trash_type, item_count } = req.body;
  const user_id = req.user.user_id;

  try {
    // Validate inputs
    if (!bin_id) {
      return res.status(400).json({ error: "Bin ID is required" });
    }

    const validTypes = ["metal", "wet", "dry", "plastic"];
    if (!validTypes.includes(trash_type)) {
      return res.status(400).json({ error: "Invalid trash type" });
    }

    if (!item_count || item_count <= 0) {
      return res
        .status(400)
        .json({ error: "Item count must be greater than 0" });
    }

    // 1. Check if user exists
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    // 2. Check if bin exists and is active
    const binCheck = await pool.query(
      "SELECT * FROM smartbins WHERE bin_id = $1 AND status = 'active'",
      [bin_id]
    );
    if (binCheck.rows.length === 0) {
      return res.status(400).json({ error: "Bin not found or inactive" });
    }

    // 3. Calculate points earned
    const points_earned = calculatePoints(trash_type, item_count);

    // 4. Insert into trashdrops
    await pool.query(
      `INSERT INTO trashdrops (user_id, bin_id, trash_type, item_count, points_earned)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, bin_id, trash_type, item_count, points_earned]
    );

    // 5. Update user total_points
    await pool.query(
      `UPDATE users
       SET total_points = total_points + $1
       WHERE user_id = $2`,
      [points_earned, user_id]
    );

    res.status(201).json({
      message: "Trash drop recorded successfully",
      points_earned,
    });
  } catch (err) {
    console.error("Trash drop error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET /trashdrops/:user_id → Get all drops of a user
router.get("/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  try {
     const result = await pool.query(
       `SELECT td.drop_id, td.trash_type, td.item_count, td.points_earned, td.drop_time,
              sb.location AS bin_location
       FROM trashdrops td
       JOIN smartbins sb ON td.bin_id = sb.bin_id
       WHERE td.user_id = $1
       ORDER BY td.drop_time DESC`,
       [user_id]
     );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
