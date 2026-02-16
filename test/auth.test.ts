import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"

describe("POST /api/v1/auth/register", () => {
    it("user created in db", async () => {
        const response = await request(app).post("/api/v1/auth/register").send({ email: "testusuario@hotmail.com", password: "12345678" })
        expect(response.status).toBe(201)
        expect(response.body.data).toEqual(expect.objectContaining({ email: "testusuario@hotmail.com" }))
        expect(response.body.data).not.toHaveProperty("password_hash")
        expect(response.body.data).not.toHaveProperty("password")
        await pool.query("DELETE FROM users WHERE email = $1", ["testusuario@hotmail.com"])

    })

})