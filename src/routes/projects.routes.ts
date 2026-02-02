import express = require("express")
const router = express.Router()

router.get("/projects", (_req, res) => {
    return res.status(200).json([{
        id: 1,
        name: "Mochila",
        precio: 45.99}])
})

export default router