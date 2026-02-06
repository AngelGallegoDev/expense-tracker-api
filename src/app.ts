import express from "express"
import healthRoutes from "./routes/health.routes"
import projectRoutes from "./routes/projects.routes"
const app = express()
const API_PREFIX = "/api/v1"

app.use(express.json())
app.use(`${API_PREFIX}/health`, healthRoutes)
app.use(`${API_PREFIX}/projects`, projectRoutes)

 export {app}