import express from "express"
import { z } from "zod"
import { pool } from "../db"

const createProjectSchema = z.object({
    name: z.string().min(1),
    price_cents: z.number().int().nonnegative().default(0),
});

const router = express.Router()

router.get("/", async (req, res) => {
    const limitRaw = req.query.limit
    const pageRaw = req.query.page
    const MAX_LIMIT = 20
    const DEFAULT_LIMIT = 10
    let limitFinal = DEFAULT_LIMIT
    let pageFinal = 1
    if (limitRaw !== undefined) {
        if (typeof limitRaw !== "string") {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "limit must be a number"
                }
            })
        }
        const limit = Number(limitRaw)
        if (Number.isNaN(limit) || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "limit must be an integer >= 1"
                }
            })
        }
        limitFinal = limit
    }
    if (pageRaw !== undefined) {
        if (typeof pageRaw !== "string") {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "page must be a number"
                }
            })
        }
        const page = Number(pageRaw)
        if (Number.isNaN(page) || !Number.isInteger(page) || page < 1) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "page must be an integer >= 1"
                }
            })
        }
        pageFinal = page

    }
    const offset = (pageFinal - 1) * limitFinal
    const result = await pool.query(
        "SELECT id, name, price_cents, created_at FROM projects ORDER BY id LIMIT $1 OFFSET $2",
        [limitFinal, offset]
    )
    const countResult = await pool.query(
        "SELECT COUNT(*)::int AS total FROM projects"
    );
    const total = countResult.rows[0].total;

    return res.status(200).json(
        {
            data: result.rows,
            meta: {
                page: pageFinal, limit: limitFinal, total
            }
        }
    )
})

router.post("/", async (req, res) => {
    const parsed = createProjectSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request body" } });
    const { name, price_cents } = parsed.data
    const { rows } = await pool.query(
        "INSERT INTO projects (name, price_cents) VALUES ($1, $2) RETURNING id, name, price_cents, created_at",
        [name, price_cents]
    )
    return res.status(201).json({data: rows[0]})
})

export default router