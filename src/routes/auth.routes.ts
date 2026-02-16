import express from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { pool } from "../db"
import { Errors } from "../errors"

const router = express.Router()

const registerSchema = z.object({
    email: z.string().email().transform(s => s.trim().toLowerCase()),
    password: z.string().min(8),
})

router.post("/register", async (req, res, next) => {

    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json(Errors.validation())
    const { email, password } = parsed.data

try {
        const password_hash = await bcrypt.hash(password, 12)
        const result = await pool.query(
            "INSERT INTO users(email, password_hash) VALUES ($1,$2) RETURNING id,email,role,created_at",
            [email, password_hash]
        )
        return res.status(201).json({ data: result.rows[0] })
    }
    catch (err: unknown) {
        const e = err as { code?: string }
        if (e.code === "23505") {
            return res.status(409).json(Errors.conflict("Email already in use"))
        }
        return next(err)
    }

})

export default router