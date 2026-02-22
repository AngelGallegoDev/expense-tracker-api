import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"

async function registerAndLogin() {
    const email = `u_${Date.now()}@mail.com`
    const password = "12345678"

    const reg = await request(app)
        .post("/api/v1/auth/register")
        .send({ email, password })
        .expect(201)

    const user = reg.body.data

    const login = await request(app)
        .post("/api/v1/auth/login")
        .send({ email, password })
        .expect(200);

    const token = login.body.data.token

    if (!token) throw new Error("Login did not return token")
    return { user, token }
}

describe("GET /api/v1/users", () => {
    it("401 when missing bearer token", async () => {
        const res = await request(app).get("/api/v1/users").expect(401);
        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED");
    });

    it("403 when role=user", async () => {
        const { user, token } = await registerAndLogin()

        const res = await request(app)
            .get("/api/v1/users")
            .set("Authorization", `Bearer ${token}`)
            .expect(403)

        expect(res.body).toHaveProperty("error.code", "FORBIDDEN")
        await pool.query("DELETE FROM users WHERE id=$1", [user.id])
    })

    it("200 when role=admin", async () => {
        const { user, token } = await registerAndLogin()
        await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.id])

        const res = await request(app)
            .get("/api/v1/users")
            .set("Authorization", `Bearer ${token}`)
            .expect(200)

        expect(Array.isArray(res.body.data)).toBe(true)
        expect(res.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ email: user.email })]))

        await pool.query("DELETE FROM users WHERE id=$1", [user.id])
    })

})