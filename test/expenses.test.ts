import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"

async function registerAndLogin() {
    const email = `u_${Date.now()}@mail.com`
    const password = "12345678"

    const reg = await request(app).post("/api/v1/auth/register").send({ email, password }).expect(201)
    const user = reg.body.data

    const login = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200)
    const token = login.body.data.token
    if (!token) throw new Error("Login did not return token")

    return { user, token }
}

describe("ET /api/v1/projects", () => {
    it("401 when missing bearer token", async () => {
        const res = await request(app)
            .post("/api/v1/expenses")
            .send({ amount_cents: 100, description: "x" })
            .expect(401)

        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED")
    })
    it("400 when body is invalid", async () => {
        const { token } = await registerAndLogin()

        const res = await request(app)
            .post("/api/v1/expenses")
            .set("Authorization", `Bearer ${token}`)
            .send({ amount_cents: 0, description: "x" })
            .expect(400)

        expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("201 creates expense for current user (user_id from token)", async () => {
        const { user, token } = await registerAndLogin()

        const res = await request(app)
            .post("/api/v1/expenses")
            .set("Authorization", `Bearer ${token}`)
            .send({ amount_cents: 1234, description: "cafe", user_id: 999999 })
            .expect(201)

        expect(res.body).toHaveProperty("data")
        expect(res.body.data).toEqual(expect.objectContaining({ amount_cents: 1234, description: "cafe" }))
        expect(Number(res.body.data.user_id)).toBe(Number(user.id))

        // cleanup (elige 1):
        await pool.query("DELETE FROM expenses WHERE id = $1", [res.body.data.id])
        await pool.query("DELETE FROM users WHERE id = $1", [user.id])
    })
}) 