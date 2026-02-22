import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { Client } from "pg"
import "dotenv/config"

const dir = path.resolve("sql")
const files = (await readdir(dir)).filter(f => f.endsWith(".sql")).sort()

const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

for (const f of files) {
  const sql = await readFile(path.join(dir, f), "utf8")
  await client.query(sql)
  console.log(`ran ${f}`)
}

await client.end()