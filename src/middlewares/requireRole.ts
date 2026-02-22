import type { Request, Response, NextFunction } from "express";
import { pool } from "../db"
import { Errors } from "../errors"

export const requereRole = (required: "user" | "admin") => {
    async (req: Request, res: Response, next: NextFunction) => {
        if (!req.userId) return res.status(500).json(Errors.internal("Missing userId"))
        try {
            const r = await pool.query("SELECT role FROM users WHERE id = $1", [req.userId])
            if (r.rows.length === 0) return res.status(401).json(Errors.unauthorized("User not found"))
            if (r.rows[0].role !== required) return res.status(403).json(Errors.forbidden("Insufficient role"))
            return next()
        }
        catch (err) {
            return next(err)
        }
    }
}