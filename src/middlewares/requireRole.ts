import type { Request, Response, NextFunction } from "express";
import { pool } from "../db"
import { Errors, withRequestId } from "../errors"

export const requireRole = (required: "user" | "admin") =>
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId
        if (userId == null) {
            return res.status(500).json(withRequestId(Errors.internal("Missing userId"), req.requestId))
        }
        try {
            const r = await pool.query("SELECT role FROM users WHERE id = $1", [req.userId])
            if (r.rows.length === 0) {
                return res.status(401).json(withRequestId(Errors.unauthorized("User not found"), req.requestId))
            }
            if (r.rows[0].role !== required) {
                return res.status(403).json(withRequestId(Errors.forbidden("Insufficient role"), req.requestId))
            }
            return next()
        }
        catch (err) {
            return next(err)
        }
    }
