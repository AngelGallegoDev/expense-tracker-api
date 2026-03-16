import express from "express"
import { z } from "zod"
import { pool } from "../db"
import { Errors, withRequestId } from "../errors"
import { requireAuth } from "../middlewares/requireAuth";

const router = express.Router()
const MAX_LIMIT = 20
const DEFAULT_LIMIT = 10
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

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
    from: z.string().trim().min(1).optional(),
    to: z.string().trim().min(1).optional(),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
})

const createExpenseSchema = z.object({
    amount_cents: z.number().int().positive(),
    description: z.string().trim().min(1).max(200),
    occurred_at: z.coerce.date().optional(),
})

function parseDateBoundary(value: string, boundary: "from" | "to") {
    const raw = value.trim()
    const isDateOnly = DATE_ONLY_REGEX.test(raw)
    const isIsoDatetime = ISO_DATETIME_REGEX.test(raw)

    if (!isDateOnly && !isIsoDatetime) return null

    const normalized = DATE_ONLY_REGEX.test(raw)
        ? `${raw}T${boundary === "from" ? "00:00:00.000" : "23:59:59.999"}Z`
        : raw

    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) return null

    if (isDateOnly) {
        const [year, month, day] = raw.split("-").map(Number)
        if (
            parsed.getUTCFullYear() !== year ||
            parsed.getUTCMonth() + 1 !== month ||
            parsed.getUTCDate() !== day
        ) return null
    }

    return parsed
}

router.get("/", requireAuth, async (req, res, next) => {
    const qParsed = paginationSchema.safeParse(req.query)
    if (!qParsed.success) {
        const first = qParsed.error.issues[0]
        const field = typeof first?.path[0] === "string" ? first.path[0] : undefined

        const msg =
            field === "limit"
                ? `limit must be an integer between 1 and ${MAX_LIMIT}`
                : field === "page"
                    ? "page must be an integer >= 1"
                    : field === "order"
                        ? "order must be either asc or desc"
                        : field === "from" || field === "to"
                            ? `${field} must be a valid ISO date or datetime`
                            : "Invalid query parameters"

        return res.status(400).json(withRequestId(Errors.validation(msg), req.requestId))
    }
    const userId = req.userId!
    const { page, limit, from, to, order } = qParsed.data
    const offset = (page - 1) * limit
    const fromDate = from ? parseDateBoundary(from, "from") : null
    const toDate = to ? parseDateBoundary(to, "to") : null

    if (from && !fromDate) {
        return res.status(400).json(withRequestId(Errors.validation("from must be a valid ISO date or datetime"), req.requestId))
    }
    if (to && !toDate) {
        return res.status(400).json(withRequestId(Errors.validation("to must be a valid ISO date or datetime"), req.requestId))
    }
    if (fromDate && toDate && fromDate > toDate) {
        return res.status(400).json(withRequestId(Errors.validation("from must be less than or equal to to"), req.requestId))
    }

    const whereClauses = ["user_id=$1"]
    const whereValues: Array<number | Date> = [userId]
    let nextParam = 2

    if (fromDate) {
        whereClauses.push(`occurred_at >= $${nextParam}`)
        whereValues.push(fromDate)
        nextParam += 1
    }

    if (toDate) {
        whereClauses.push(`occurred_at <= $${nextParam}`)
        whereValues.push(toDate)
        nextParam += 1
    }

    const whereSql = whereClauses.join(" AND ")
    const orderSql = order.toUpperCase()

    try {
        const totalR = await pool.query(
            `SELECT COUNT(*)::int AS total FROM expenses WHERE ${whereSql}`,
            whereValues
        )
        const listR = await pool.query(
            `SELECT id, user_id, amount_cents, description, occurred_at, created_at
       FROM expenses WHERE ${whereSql}
       ORDER BY occurred_at ${orderSql}, id ${orderSql}
       LIMIT $${nextParam} OFFSET $${nextParam + 1}`,
            [...whereValues, limit, offset]
        )
        return res.json({ data: listR.rows, meta: { page, limit, total: totalR.rows[0].total } })
    } catch (err) {
        return next(err)
    }
})
router.get("/:id", requireAuth, async (req, res, next) => {
    const parsedParams = idSchema.safeParse(req.params)
    if (!parsedParams.success) return res.status(400).json(withRequestId(Errors.validation("id must be a positive integer"), req.requestId))
    const userId = req.userId!
    const id = parsedParams.data.id
    try {
        const { rows } = await pool.query(`SELECT id, amount_cents, description, occurred_at, created_at
       FROM expenses
       WHERE id = $1 AND user_id = $2`,
            [id, userId])
        if (rows.length === 0) return res.status(404).json(withRequestId(Errors.notFound("Expense not found"), req.requestId))
        return res.status(200).json({ data: rows[0] })
    }
    catch (err) {
        return next(err)
    }
})

router.post("/", requireAuth, async (req, res, next) => {
    const parsed = createExpenseSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(withRequestId(Errors.validation("Invalid request body"), req.requestId))
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
    if (!p.success) return res.status(400).json(withRequestId(Errors.validation("id must be a positive integer"), req.requestId))
    const userId = req.userId!

    try {
        const r = await pool.query(
            `DELETE FROM expenses WHERE id=$1 AND user_id=$2 RETURNING id`,
            [p.data.id, userId]
        )
        if (r.rowCount === 0) return res.status(404).json(withRequestId(Errors.notFound("Expense not found"), req.requestId))
        return res.status(204).send()
    } catch (err) {
        return next(err)
    }
})

router.patch("/:id", requireAuth, async (req, res, next) => {
    const parsedParams = idSchema.safeParse(req.params)
    if (!parsedParams.success) return res.status(400).json(withRequestId(Errors.validation("id must be a positive integer"), req.requestId))

    const parsedBody = patchExpensSchema.safeParse(req.body)
    if (!parsedBody.success) return res.status(400).json(withRequestId(Errors.validation("Invalid request body"), req.requestId))
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

        if (r.rowCount === 0) return res.status(404).json(withRequestId(Errors.notFound("Expense not found"), req.requestId));
        return res.status(200).json({ data: r.rows[0] });
    }
    catch (err) { return next(err) }
})

export default router
