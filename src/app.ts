import express = require("express")
const app = express() 

app.use(express.json())

app.get("/health", (_req, res) => {
    return res.status(200).json({status: "ok"})
})
 export {app}