import { pool } from "../src/db"

describe("db", () => {
    afterAll(async () => {
        await pool.end()
    })
    it("should connect and run SELECT 1", async () => {
    const res = await pool.query("SELECT 1 as ok");
    expect(res.rows[0].ok).toBe(1);
  });
})