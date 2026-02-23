import express from "express"
import { z } from "zod"
import { pool } from "../db"
import { Errors } from "../errors"
import { requireAuth } from "../middlewares/requireAuth";

const router = express.Router()
const createExpenseSchema = z.object({
    amount_cents: z.number().int().positive(),
    description: z.string().trim().min(1).max(200),
    occurred_at: z.coerce.date().optional(),
})

router.post("/", requireAuth, async (req, res, next) => {
    const parsed = createExpenseSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(Errors.validation("Invalid request body"))
    if (!req.userId) return res.status(401).json(Errors.unauthorized("Missing auth"))

    try {
        const { amount_cents, description, occurred_at } = parsed.data
        const q = `
      INSERT INTO expenses (user_id, amount_cents, description, occurred_at)
      VALUES ($1, $2, $3, COALESCE($4, NOW()))
      RETURNING id, user_id, amount_cents, description, occurred_at, created_at
    `
        const r = await pool.query(q, [req.userId!, amount_cents, description, occurred_at ?? null])
        return res.status(201).json({ data: r.rows[0] })
    } catch (err) {
        return next(err)
    }
})

export default router