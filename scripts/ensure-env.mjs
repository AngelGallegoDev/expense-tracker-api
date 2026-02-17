import fs from "node:fs";

if (!fs.existsSync(".env")) {
  if (!fs.existsSync(".env.example")) {
    console.error("Missing .env and .env.example");
    process.exit(1);
  }
  fs.copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}
