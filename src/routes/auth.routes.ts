import express from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { pool } from "../db"
import { Errors } from "../errors"
import { signAccessToken } from "../auth/jwt"

const router = express.Router()

const registerSchema = z.object({
    email: z.string().email().transform(s => s.trim().toLowerCase()),
    password: z.string().min(8),
})
const loginSchema = registerSchema

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
router.post("/login", async (req, res, next) => {
    try {
        
        const parsed = loginSchema.safeParse(req.body)
        if (!parsed.success) return res.status(400).json(Errors.validation())

        const { email, password } = parsed.data
        const r = await pool.query(
            "SELECT id, email, password_hash FROM users WHERE email = $1",
            [email]
        )
        if (r.rows.length === 0) return res.status(401).json(Errors.unauthorized("Invalid credentials"))

        const user = r.rows[0]
        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return res.status(401).json(Errors.unauthorized("Invalid credentials"))

        const userId = Number(user.id)
        const token = signAccessToken(userId)

        return res.status(200).json({ data: { token, user: { id: userId, email: user.email } } })
    } catch (err) {
        next(err)
    }
})

export default router