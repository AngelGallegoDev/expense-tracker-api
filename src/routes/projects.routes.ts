import express = require("express")
const router = express.Router()

router.get("/", (req, res) => {
    const limitRaw = req.query.limit
    const MAX_LIMIT = 20
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
                    message: ""
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