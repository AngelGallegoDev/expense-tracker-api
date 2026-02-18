import * as dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})
