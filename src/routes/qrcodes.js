const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const auth = require("../middleware/auth");

// Helper: Calculate Points

const calculatePoints = (trash_type, item_count) => {
  const pointsMap = { metal: 5, wet: 2, dry: 3, plastic: 4 };
  return (pointsMap[trash_type] || 1) * item_count;
};


// POST /qrcodes/scan → User scans QR code

router.post("/scan", auth, async (req, res) => {
  const { qr_id, trash_type, item_count } = req.body;
  const user_id = req.user.user_id;

  try {
    // Validate qr_id
    if (!qr_id || isNaN(qr_id)) {
      return res.status(400).json({ error: "Valid qr_id is required" });
    }

    // Validate trash_type
    const validTypes = ["metal", "wet", "dry", "plastic"];
    if (!validTypes.includes(trash_type)) {
      return res.status(400).json({ error: "Invalid trash type" });
    }

    // Validate item_count
    if (!item_count || item_count <= 0) {
      return res
        .status(400)
        .json({ error: "Item count must be greater than 0" });
    }

    // 1. Check user exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    // 2. Check QR code exists and is unused
    const qrResult = await pool.query(
      "SELECT * FROM qrcodes WHERE qr_id = $1 AND is_used = FALSE",
      [qr_id]
    );

    if (qrResult.rows.length === 0) {
      return res.status(400).json({ error: "QR code invalid or already used" });
    }

    const bin_id = qrResult.rows[0].bin_id;

    // 3. Check if bin exists
    const binCheck = await pool.query(
      "SELECT * FROM smartbins WHERE bin_id = $1",
      [bin_id]
    );

    if (binCheck.rows.length === 0) {
      return res.status(400).json({ error: "Bin not found" });
    }

    // 4. Calculate points
    const points_earned = calculatePoints(trash_type, item_count);

    // 5. Insert trash drop
    await pool.query(
      `INSERT INTO trashdrops (user_id, bin_id, trash_type, item_count, points_earned, drop_time)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user_id, bin_id, trash_type, item_count, points_earned]
    );

    // 6. Update user points
    await pool.query(
      `UPDATE users
       SET total_points = total_points + $1
       WHERE user_id = $2`,
      [points_earned, user_id]
    );

    // 7. Mark QR code as used
    await pool.query("UPDATE qrcodes SET is_used = TRUE WHERE qr_id = $1", [
      qr_id,
    ]);

    res.json({
      message: "Trash drop recorded successfully",
      points_earned,
    });
  } catch (err) {
    console.error("QR scan error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET /qrcodes/:bin_id → List QR codes for a bin

router.get("/:bin_id", async (req, res) => {
  const bin_id = req.params.bin_id;

  try {
    if (!bin_id || isNaN(bin_id)) {
      return res.status(400).json({ error: "Invalid bin_id" });
    }

    const result = await pool.query(
      `SELECT * FROM qrcodes
       WHERE bin_id = $1
       ORDER BY created_at DESC`,
      [bin_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get QR codes error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
