import express from "express"
import { z } from "zod"
import { pool } from "../db"
import { Errors } from "../errors"
import { requireAuth } from "../middlewares/requireAuth";

const router = express.Router()
const MAX_LIMIT = 20
const DEFAULT_LIMIT = 10

const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

const patchExpensSchema = z.object({
    amount_cents: z.number().int().positive().optional(),
    description: z.string().trim().min(1).optional(),
    occurred_at: z.string().datetime().optional()
}).refine((v) => Object.keys(v).length > 0, { message: "Body cannot be empty" });

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
    const userId = req.userId!

    const { page, limit } = qParsed.data
    const offset = (page - 1) * limit

    try {
        const totalR = await pool.query(`SELECT COUNT(*)::int AS total FROM expenses WHERE user_id=$1`, [userId])
        const listR = await pool.query(
            `SELECT id, user_id, amount_cents, description, occurred_at, created_at
       FROM expenses WHERE user_id=$1
       ORDER BY occurred_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        )
        return res.json({ data: listR.rows, meta: { page, limit, total: totalR.rows[0].total } })
    } catch (err) {
        return next(err)
    }
})
router.get("/:id", requireAuth, async (req, res, next) => {
    const parsedParams = idSchema.safeParse(req.params)
    if (!parsedParams.success) return res.status(400).json(Errors.validation("Invalid id"))
    const userId = req.userId!
    const id = parsedParams.data.id
    try {
        const { rows } = await pool.query(`SELECT id, amount_cents, description, occurred_at, created_at
       FROM expenses
       WHERE id = $1 AND user_id = $2`,
            [id, userId])
        if (rows.length === 0) return res.status(404).json(Errors.notFound("Expense not found"))
        return res.status(200).json({ data: rows[0] })
    }
    catch (err) {
        return next(err)
    }
})

router.post("/", requireAuth, async (req, res, next) => {
    const parsed = createExpenseSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(Errors.validation("Invalid request body"))
    const userId = req.userId!

    try {
        const { amount_cents, description, occurred_at } = parsed.data
        const q = `
      INSERT INTO expenses (user_id, amount_cents, description, occurred_at)
      VALUES ($1, $2, $3, COALESCE($4, NOW()))
      RETURNING id, user_id, amount_cents, description, occurred_at, created_at
    `
        const r = await pool.query(q, [userId, amount_cents, description, occurred_at ?? null])
        return res.status(201).json({ data: r.rows[0] })
    } catch (err) {
        return next(err)
    }
})

router.delete("/:id", requireAuth, async (req, res, next) => {
    const p = idSchema.safeParse(req.params)
    if (!p.success) return res.status(400).json(Errors.validation("Invalid id"))
    const userId = req.userId!

    try {
        const r = await pool.query(
            `DELETE FROM expenses WHERE id=$1 AND user_id=$2 RETURNING id`,
            [p.data.id, userId]
        )
        if (r.rowCount === 0) return res.status(404).json(Errors.notFound("Expense not found"))
        return res.status(204).send()
    } catch (err) {
        return next(err)
    }
})

router.patch("/:id", requireAuth, async (req, res, next) => {
    const parsedParams = idSchema.safeParse(req.params)
    if (!parsedParams.success) return res.status(400).json(Errors.validation("id must be a positive integer"))

    const parsedBody = patchExpensSchema.safeParse(req.body)
    if (!parsedBody.success) return res.status(400).json(Errors.validation("Invalid request body"))
    const userId = req.userId!
    const id = parsedParams.data.id
    const { amount_cents, description, occurred_at } = parsedBody.data

    try {
        const q = `
  UPDATE expenses
  SET
    amount_cents = COALESCE($1, amount_cents),
    description  = COALESCE($2, description),
    occurred_at  = COALESCE($3, occurred_at)
  WHERE id = $4 AND user_id = $5
  RETURNING id, user_id, amount_cents, description, occurred_at, created_at
`;

        const r = await pool.query(q, [
            amount_cents ?? null,
            description ?? null,
            occurred_at ?? null,
            id,
            userId,
        ]);

        if (r.rowCount === 0) return res.status(404).json(Errors.notFound("Expense not found"));
        return res.status(200).json({ data: r.rows[0] });
    }
    catch (err) { return next(err) }
})

export default router