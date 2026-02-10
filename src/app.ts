import express from "express"
import healthRoutes from "./routes/health.routes"
import projectRoutes from "./routes/projects.routes"
import { Errors } from "./errors"
const app = express()
const API_PREFIX = "/api/v1"

app.use(express.json())
app.use(`${API_PREFIX}/health`, healthRoutes)
app.use(`${API_PREFIX}/projects`, projectRoutes)
app.use((_req, res) => {
  res.status(404).json(Errors.notFound());
});
app.use((err: unknown, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json(Errors.internal());
})

export { app }