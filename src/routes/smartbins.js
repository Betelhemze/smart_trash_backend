// src/routes/smartbins.js
const express = require("express");
const router = express.Router();
const {pool} = require("../config/db");
const adminAuth = require("../middleware/adminAuth");


// GET /bins → Get all bins (all users)

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM smartbins ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get all bins error:", err);
    res.status(500).json({ error: err.message });
  }
});


// POST /bins → Create a new bin (admin only)

router.post("/", adminAuth, async (req, res) => {
  const { location, status } = req.body;
  const admin_id = req.user.user_id;

  try {
    // Validate location
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    // Validate status
    const validStatuses = ["active", "inactive"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    await pool.query(
      `INSERT INTO smartbins (location, status, created_at, admin_id)
       VALUES ($1, $2, NOW(), $3)`,
      [location, status || "active", admin_id]
    );

    res.status(201).json({ message: "Smart bin created successfully" });
  } catch (err) {
    console.error("Create bin error:", err);
    res.status(500).json({ error: err.message });
  }
});


// PATCH /bins/:bin_id/status → Update bin status (admin only)

router.patch("/:bin_id/status", adminAuth, async (req, res) => {
  const bin_id = req.params.bin_id;
  const { status } = req.body;

  try {
    // Validate status
    const validStatuses = ["active", "inactive"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // Check if bin exists
    const check = await pool.query(
      "SELECT * FROM smartbins WHERE bin_id = $1",
      [bin_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Bin not found" });
    }

    // Update status
    await pool.query(
      `UPDATE smartbins
       SET status = $1
       WHERE bin_id = $2`,
      [status, bin_id]
    );

    res.json({ message: "Bin status updated successfully" });
  } catch (err) {
    console.error("Update bin status error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET /bins/:bin_id → Get bin details (all users)

router.get("/:bin_id", async (req, res) => {
  const bin_id = req.params.bin_id;

  try {
    const result = await pool.query(
      `SELECT * FROM smartbins WHERE bin_id = $1`,
      [bin_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bin not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get bin details error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
