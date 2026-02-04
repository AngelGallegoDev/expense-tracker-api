import express = require("express")
const router = express.Router()

router.get("/", (req, res) => {
    const limitRaw = req.query.limit
    const pageraw = req.query.page
    const MAX_LIMIT = 20
    const DEFAULT_LIMIT = 10 
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
    }
    if(pageraw !== undefined) {
        if(typeof pageraw !== "string") {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "page must be a number"
                }
            })
        }
        const page = Number(pageraw)
        if(Number.isNaN(page) || !Number.isInteger(page)|| Number(page)< 1) {
            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "page must be an integer >= 1"
                }
            })
        }
    }

    return res.status(200).json(
        {
            data: [{
                id: 1,
                name: "Mochila",
                precio: 45.99
            }]
        }
    )
})

export default router