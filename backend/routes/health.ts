const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", (req, res) => {
  res.json({ status: "ok", message: "OwnUrVoice API is running" });
});

router.get("/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
