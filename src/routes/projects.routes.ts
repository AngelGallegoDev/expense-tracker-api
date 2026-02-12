import express from "express"
import { z } from "zod"
import { pool } from "../db"
import { Errors } from "../errors"
const MAX_LIMIT = 20
const DEFAULT_LIMIT = 10
const createProjectSchema = z.object({
    name: z.string().min(1),
    price_cents: z.number().int().nonnegative(),
});
const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
    page: z.coerce.number().int().min(1).optional().default(1)
})
const idSchema = z.object({
    id: z.coerce.number().int().positive()
})

const router = express.Router()

router.get("/", async (req, res) => {

    const parsed = paginationSchema.safeParse(req.query)

    if (!parsed.success) {
        const first = parsed.error.issues[0]
        const field = first?.path[0]

        const msg =
            field === "limit"
                ? `limit must be an integer between 1 and ${MAX_LIMIT}`
                : "page must be an integer >= 1"

        return res.status(400).json(Errors.validation(msg))
    }
    const { limit, page } = parsed.data
    const offset = (page - 1) * limit

    const result = await pool.query(
        "SELECT id, name, price_cents, created_at FROM projects ORDER BY id LIMIT $1 OFFSET $2",
        [limit, offset]
    )
    const countResult = await pool.query(
        "SELECT COUNT(*)::int AS total FROM projects"
    );
    const total = countResult.rows[0].total;

    return res.status(200).json(
        {
            data: result.rows,
            meta: {
                page, limit, total
            }
        }
    )
});

router.get("/:id", async (req, res, next) => {
    const parsed = idSchema.safeParse(req.params)
    if (!parsed.success) return res.status(400).json(Errors.validation("id must be a positive integer"))

    const { id } = parsed.data
    try {
        const { rows } = await pool.query("SELECT id, name, price_cents, created_at FROM projects WHERE id = $1",
            [id])
        if (rows.length === 0) return res.status(404).json(Errors.notFound("Project not found"))
        return res.status(200).json({ data: rows[0] })
    }
    catch (err) {
        return next(err)
    }
});

router.post("/", async (req, res, next) => {
    const parsed = createProjectSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(Errors.validation("Invalid request body"));
    try {
        const { name, price_cents } = parsed.data
        const { rows } = await pool.query(
            "INSERT INTO projects (name, price_cents) VALUES ($1, $2) RETURNING id, name, price_cents, created_at",
            [name, price_cents]
        )
        return res.status(201).json({ data: rows[0] })
    }
    catch (err) { 
        return next(err)
    }

});

router.delete("/:id", async (req, res, next) => {
    const parsed = idSchema.safeParse(req.params)
    if (!parsed.success) return res.status(400).json(Errors.validation("id must be a positive integer"))
    const { id } = parsed.data
    try {
        const { rows } = await pool.query(
            "DELETE FROM projects WHERE id = $1 RETURNING id",
            [id]
        )
        if (rows.length === 0) return res.status(404).json(Errors.notFound("Project not found"))
        return res.status(204).send()
    }
    catch (err) {
        return next(err)
    }
});

router.put("/:id", async (req, res, next) => {
    const parsedParams = idSchema.safeParse(req.params)
    if (!parsedParams.success) return res.status(400).json(Errors.validation("id must be a positive integer"))

    const parsedBody = createProjectSchema.safeParse(req.body)
    if (!parsedBody.success) return res.status(400).json(Errors.validation("Invalid request body"))
    const { id } = parsedParams.data
    const { name, price_cents } = parsedBody.data


    try {
        const { rows } = await pool.query("UPDATE projects SET name = $1, price_cents = $2 WHERE id = $3 RETURNING id, name, price_cents, created_at",
            [name, price_cents, id])
        if (rows.length === 0) return res.status(404).json(Errors.notFound("Project not found"))

        return res.status(200).json({ data: rows[0] })
    }
    catch (err) { return next(err) }

});

export default router