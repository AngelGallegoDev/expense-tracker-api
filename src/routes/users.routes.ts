
import express from "express";
import { pool } from "../db";
import { Errors } from "../errors";
import { requireAuth } from "../middlewares/requireAuth";
import { requireRole } from "../middlewares/requireRole";

const router = express.Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { rows } = await pool.query(
      "SELECT id, email, created_at FROM users WHERE id = $1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json(Errors.unauthorized("User not found"))
    }

    return res.status(200).json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/", requireAuth, requireRole("admin"), async( req, res, next ) => {
  try {
    const r = await pool.query("SELECT id, email, role, created_at FROM users ORDER BY id ASC")
    return res.json({ data: r.rows })
  }
  catch(err) { return next(err)}
})
export default router