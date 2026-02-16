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
    it("POST user not email", async () => {
        const response = await request(app).post("/api/v1/auth/register").send({ email: "", password: "12345678" })
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("409 when email already exists", async () => {
        const email = `test+${Date.now()}@mail.com`;
        const password = "12345678";

        await request(app).post("/api/v1/auth/register").send({ email, password }).expect(201);

        const res2 = await request(app).post("/api/v1/auth/register").send({ email, password }).expect(409);
        expect(res2.body).toHaveProperty("error.code", "CONFLICT");

        await pool.query("DELETE FROM users WHERE email = $1", [email]);
    });

})