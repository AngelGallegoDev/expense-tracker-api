import express from "express"
import { z } from "zod"
import { pool } from "../db"
import { Errors } from "../errors"
import { requireAuth } from "../middlewares/requireAuth";

const router = express.Router()
const MAX_LIMIT = 20
const DEFAULT_LIMIT = 10
const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
    page: z.coerce.number().int().min(1).optional().default(1),
})

const createExpenseSchema = z.object({
    amount_cents: z.number().int().positive(),
    description: z.string().trim().min(1).max(200),
    occurred_at: z.coerce.date().optional(),
})

router.get("/", requireAuth, async (req, res, next) => {
    const qParsed = paginationSchema.safeParse(req.query)
    if (!qParsed.success) return res.status(400).json(Errors.validation("Invalid query params"))
    if (!req.userId) return res.status(401).json(Errors.unauthorized("Missing auth"))

    const { page, limit } = qParsed.data
    const offset = (page - 1) * limit

    try {
        const totalR = await pool.query(`SELECT COUNT(*)::int AS total FROM expenses WHERE user_id=$1`, [req.userId])
        const listR = await pool.query(
            `SELECT id, user_id, amount_cents, description, occurred_at, created_at
       FROM expenses WHERE user_id=$1
       ORDER BY occurred_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
            [req.userId, limit, offset]
        )
        return res.json({ data: listR.rows, meta: { page, limit, total: totalR.rows[0].total } })
    } catch (err) {
        return next(err)
    }
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