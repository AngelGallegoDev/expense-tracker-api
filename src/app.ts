import express = require("express")
import healthRoutes from "./routes/health.routes"
import projectRoutes from "./routes/projects.routes"
const app = express() 

app.use(express.json())
app.use("/health", healthRoutes)
app.use("/projects", projectRoutes)

 export {app}