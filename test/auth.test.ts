import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"

describe("POST /api/v1/auth/register", () => {
    it("user created in db", async () => {

        const email = `test+${Date.now()}@mail.com`
        const password = "12345678"
        const response = await request(app).post("/api/v1/auth/register").send({ email, password })
        expect(response.status).toBe(201)
        expect(response.body.data).toEqual(expect.objectContaining({ email }))
        expect(response.body.data).not.toHaveProperty("password_hash")
        expect(response.body.data).not.toHaveProperty("password")
        await pool.query("DELETE FROM users WHERE email = $1", [email])

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
describe("POST /api/v1/auth/login", () => {

    it("200 login returns token + user", async () => {
        const email = `t_${Date.now()}@mail.com`
        const password = "12345678"

        await request(app).post("/api/v1/auth/register").send({ email, password }).expect(201)

        const res = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200)

        expect(res.body).toHaveProperty("data.token")
        expect(String(res.body.data.token).split(".")).toHaveLength(3)
        expect(res.body).toHaveProperty("data.user.email", email)
        expect(res.body.data.user).not.toHaveProperty("password_hash")

        await pool.query("DELETE FROM users WHERE email=$1", [email])
    })
    it("401 when password is wrong", async () => {
        const email = `t_${Date.now()}@mail.com`
        const password = "12345678"

        await request(app).post("/api/v1/auth/register").send({ email, password }).expect(201)

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email, password: "wrongpass" })
            .expect(401)

        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED")
        expect(res.body).toHaveProperty("error.message", "Invalid credentials")

        await pool.query("DELETE FROM users WHERE email=$1", [email])
    })
    it("401 when user does not exist", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: `no_${Date.now()}@mail.com`, password: "12345678" })
            .expect(401)

        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED")
        expect(res.body).toHaveProperty("error.message", "Invalid credentials")
    })
    it("400 when body is invalid", async () => {
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "not-an-email", password: "12345678" })
            .expect(400)

        expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })


})