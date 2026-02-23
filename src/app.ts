import express from "express"
import healthRoutes from "./routes/health.routes"
import projectRoutes from "./routes/projects.routes"
import authRegisterRoutes from "./routes/auth.routes"
import expensesRoutes from "./routes/expenses.routes"
import usersRouter from "./routes/users.routes"
import { Errors } from "./errors"
import * as swaggerUi from "swagger-ui-express";
import * as YAML from "yaml";
import fs from "node:fs";
import path from "node:path";

const app = express()
const API_PREFIX = "/api/v1"
app.use(express.json())
const openapiPath = path.join(process.cwd(), "openapi.yaml");
const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, "utf8"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.use(`${API_PREFIX}/health`, healthRoutes)
app.use(`${API_PREFIX}/projects`, projectRoutes)
app.use(`${API_PREFIX}/expenses`, expensesRoutes)
app.use(`${API_PREFIX}/auth`, authRegisterRoutes)
app.use(`${API_PREFIX}/users`, usersRouter);
app.use((_req, res) => {
  res.status(404).json(Errors.notFound());
});
app.use((err: unknown, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json(Errors.internal());
})

export { app }