process.env.DOTENV_CONFIG_QUIET = "true";
import { pool } from "../src/db";


afterAll(async () => {
  await pool.end();
});
