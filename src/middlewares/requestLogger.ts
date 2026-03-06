import { Request, Response, NextFunction } from "express";

export const requestLogger = ( req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now()
    res.on("finish", () => {
        const durationMs = Date.now() - startedAt

        console.info({
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs
        })
    })
    next()
}