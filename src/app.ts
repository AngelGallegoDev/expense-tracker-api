import express from "express"
import healthRoutes from "./routes/health.routes"
import projectRoutes from "./routes/projects.routes"
const app = express()
const API_PREFIX = "/api/v1"

app.use(express.json())
app.use(`${API_PREFIX}/health`, healthRoutes)
app.use(`${API_PREFIX}/projects`, projectRoutes)
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});
app.use((err: unknown, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
})

export { app }