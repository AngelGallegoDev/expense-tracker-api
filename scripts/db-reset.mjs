import "dotenv/config"
const force = process.argv.includes("--force") || process.env.DB_RESET_FORCE === "1"

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to reset DB in production")
}
if (!force) {
  throw new Error("Run with --force (or set DB_RESET_FORCE=1) to confirm db reset")
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

const dbUrl = new URL(process.env.DATABASE_URL)
const dbName = decodeURIComponent(dbUrl.pathname.replace(/^\//, ""))

// valida nombre para evitar inyección en SQL (DROP DATABASE no acepta params)
if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
  throw new Error(`Unsafe database name: ${dbName}`)
}

const adminUrl = new URL(dbUrl.toString())
adminUrl.pathname = "/postgres" // DB admin

import { Client } from "pg"
import { spawnSync } from "node:child_process"

const client = new Client({ connectionString: adminUrl.toString() })
await client.connect()

// DROP y CREATE (quote con "")
await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE);`)
await client.query(`CREATE DATABASE "${dbName}";`)

await client.end()

// ahora corre migrations (usa el mismo DATABASE_URL original)
const r = spawnSync("node", ["scripts/db-migrate.mjs"], { stdio: "inherit" })
if (r.status !== 0) process.exit(r.status ?? 1)