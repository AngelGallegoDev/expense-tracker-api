import express from "express"
import healthRoutes from "./routes/health.routes"
import projectRoutes from "./routes/projects.routes"
import authRegisterRoutes from "./routes/auth.routes"
import expensesRoutes from "./routes/expenses.routes"
import usersRouter from "./routes/users.routes"
import { requestId } from "./middlewares/requestId"
import type { Request, Response, NextFunction } from "express"
import { Errors, withRequestId } from "./errors"
import * as swaggerUi from "swagger-ui-express";
import * as YAML from "yaml";
import fs from "node:fs";
import path from "node:path";
import { requestLogger } from "./middlewares/requestLogger"

const app = express()
const API_PREFIX = "/api/v1"
app.use(requestId)
app.use(requestLogger)
app.use(express.json())
const openapiPath = path.join(process.cwd(), "openapi.yaml");
const openapiDoc = YAML.parse(fs.readFileSync(openapiPath, "utf8"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.use(`${API_PREFIX}/health`, healthRoutes)
app.use(`${API_PREFIX}/projects`, projectRoutes)
app.use(`${API_PREFIX}/expenses`, expensesRoutes)
app.use(`${API_PREFIX}/auth`, authRegisterRoutes)
app.use(`${API_PREFIX}/users`, usersRouter);
app.use((req, res) => {
  res.status(404).json(withRequestId(Errors.notFound(), req.requestId));
});
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error({ requestId: req.requestId, err});
    res.status(500).json(withRequestId(Errors.internal(), req.requestId));
})

export { app }