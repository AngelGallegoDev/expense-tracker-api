import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"
import jwt from "jsonwebtoken"

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

describe("GET /api/v1/users/me", () => {
    it("401 when missing bearer token", async () => {
        const res = await request(app).get("/api/v1/users/me").expect(401);
        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED");
    });

    it("401 when token is invalid", async () => {
        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", "Bearer not-a-real-token")
            .expect(401);
        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED");
    });

    it("200 returns current user", async () => {
        const { user, token } = await registerAndLogin();

        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

        expect(res.body).toHaveProperty("data");
        expect(res.body.data).toEqual(
            expect.objectContaining({
                id: user.id,
                email: user.email,
            })
        );
        expect(res.body.data).toHaveProperty("created_at");

        await pool.query("DELETE FROM users WHERE id = $1", [user.id]);
    });


    it("401 when token valid but user does not exist", async () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("Missing JWT_SECRET in test env");

        const fakeId = 999999999;
        const token = jwt.sign({}, secret, { subject: String(fakeId) });

        const res = await request(app)
            .get("/api/v1/users/me")
            .set("Authorization", `Bearer ${token}`)
            .expect(401);
        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED");
        expect(res.body).toHaveProperty("error.message", "User not found");
    });

})