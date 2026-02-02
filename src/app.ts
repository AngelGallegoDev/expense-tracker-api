import express = require("express")
import healthRoutes from "./routes/health.routes"
const app = express() 

app.use(express.json())
app.use(healthRoutes)

 export {app}