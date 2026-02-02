import express = require("express")
import healthRoutes from "./routes/health.routes"
import projectsRoutes from "./routes/projects.routes"
const app = express() 

app.use(express.json())
app.use(healthRoutes)
app.use(projectsRoutes)

 export {app}