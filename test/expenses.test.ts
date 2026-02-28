import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"

async function registerAndLogin() {
    const email = `u_${Date.now()}_${Math.random().toString(16).slice(2)}@mail.com`
    const password = "12345678"

    const reg = await request(app).post("/api/v1/auth/register").send({ email, password }).expect(201)
    const user = reg.body.data

    const login = await request(app).post("/api/v1/auth/login").send({ email, password }).expect(200)
    const token = login.body.data.token
    if (!token) throw new Error("Login did not return token")

    return { user, token }
}

describe("POST /api/v1/expenses", () => {
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

        await pool.query("DELETE FROM expenses WHERE id = $1", [res.body.data.id])
    })


})
describe("GET /api/v1/expenses", () => {
    it("401 without token", async () => {
        const res = await request(app).get("/api/v1/expenses").expect(401)
        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED")
    })

    it("only returns caller's expenses (isolation)", async () => {
        const a = await registerAndLogin()
        const b = await registerAndLogin()

        const expA = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 111, description: "onlyA" })
            .expect(201)

        const expB = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${b.token}`)
            .send({ amount_cents: 222, description: "onlyB" })
            .expect(201)

        const res = await request(app)
            .get("/api/v1/expenses?limit=10&page=1")
            .set("Authorization", `Bearer ${a.token}`)
            .expect(200)

        expect(res.body.data.some((e: any) => e.description === "onlyB")).toBe(false)
        expect(res.body.meta.total).toBe(1)

        await pool.query("DELETE FROM expenses WHERE id = ANY($1::int[])", [[expA.body.data.id, expB.body.data.id]])
    })

    it("paginates and returns meta.total", async () => {
        const a = await registerAndLogin()

        const createdIds: number[] = []
        for (const desc of ["e1", "e2", "e3"]) {
            const r = await request(app).post("/api/v1/expenses")
                .set("Authorization", `Bearer ${a.token}`)
                .send({ amount_cents: 100, description: desc })
                .expect(201)
            createdIds.push(r.body.data.id)
        }

        const p1 = await request(app)
            .get("/api/v1/expenses?limit=2&page=1")
            .set("Authorization", `Bearer ${a.token}`)
            .expect(200)

        expect(p1.body.meta.total).toBe(3)
        expect(p1.body.data).toHaveLength(2)

        const p2 = await request(app)
            .get("/api/v1/expenses?limit=2&page=2")
            .set("Authorization", `Bearer ${a.token}`)
            .expect(200)

        expect(p2.body.meta.total).toBe(3)
        expect(p2.body.data).toHaveLength(1)

        await pool.query("DELETE FROM expenses WHERE id = ANY($1::int[])", [createdIds])
    })
    it("400 when query params are invalid", async () => {
        const { token } = await registerAndLogin()

        const res = await request(app)
            .get("/api/v1/expenses?limit=0&page=1")
            .set("Authorization", `Bearer ${token}`)
            .expect(400)

        expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
})
describe("GET /api/v1/expenses/:id", () => {
    it("404 when trying to read someone else's expense", async () => {
        const a = await registerAndLogin()
        const b = await registerAndLogin()

        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "notYours" })
            .expect(201)

        await request(app)
            .get(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${b.token}`)
            .expect(404)

        await pool.query("DELETE FROM expenses WHERE id = $1", [created.body.data.id])
    })
    it("401 without token", async () => {
        const res = await request(app)
            .get("/api/v1/expenses/1")
            .expect(401)

        expect(res.body).toHaveProperty("error.code", "UNAUTHORIZED")
    })
    it("400 when id is invalid", async () => {
        const a = await registerAndLogin()

        const res = await request(app)
            .get("/api/v1/expenses/abc")
            .set("Authorization", `Bearer ${a.token}`)
            .expect(400)

        expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("404 when expense does not exist", async () => {
        const a = await registerAndLogin()

        await request(app)
            .get("/api/v1/expenses/999999999")
            .set("Authorization", `Bearer ${a.token}`)
            .expect(404)
    })
    it("200 returns expense for owner", async () => {
        const a = await registerAndLogin()

        const created = await request(app)
            .post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "readMe" })
            .expect(201)

        const res = await request(app)
            .get(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${a.token}`)
            .expect(200)

        expect(res.body.data.id).toBe(created.body.data.id)
        expect(res.body.data.description).toBe("readMe")

        await pool.query("DELETE FROM expenses WHERE id = $1", [created.body.data.id])
    })
    it("400 when id is not an integer", async () => {
        const a = await registerAndLogin()

        await request(app)
            .get("/api/v1/expenses/1.2")
            .set("Authorization", `Bearer ${a.token}`)
            .expect(400)
    })

})
describe("DELETE /api/v1/expenses/:id", () => {
    it("204 owner can delete", async () => {
        const a = await registerAndLogin()
        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "toDel" }).expect(201)

        await request(app).delete(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${a.token}`)
            .expect(204)
    })

    it("404 when trying to delete someone else's expense", async () => {
        const a = await registerAndLogin()
        const b = await registerAndLogin()
        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "notYours" }).expect(201)

        await request(app).delete(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${b.token}`)
            .expect(404)

        await request(app).delete(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${a.token}`)
            .expect(204)
    })
})
describe("PATCH /api/v1/expenses/:id", () => {
    it("expect 401 no token", async () => {
        const a = await registerAndLogin()
        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "toDel" }).expect(201)

        await request(app).patch(`/api/v1/expenses/${created.body.data.id}`)
            .send({ amount_cents: 100, description: "x" })
            .expect(401)
        await pool.query("DELETE FROM expenses WHERE id = $1", [created.body.data.id]);
    })
    it("400 when id is invalid", async () => {
        const a = await registerAndLogin();

        const res = await request(app)
            .patch("/api/v1/expenses/abc")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ description: "x" })
            .expect(400);

        expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
    });
    it("400 when body is empty", async () => {
        const a = await registerAndLogin();
        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "seed" })
            .expect(201);

        await request(app)
            .patch(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${a.token}`)
            .send({})
            .expect(400);

        await pool.query("DELETE FROM expenses WHERE id = $1", [created.body.data.id]);
    });
    it("200 updates description (owner)", async () => {
        const a = await registerAndLogin();
        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 1234, description: "cafe" })
            .expect(201);

        const res = await request(app)
            .patch(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${a.token}`)
            .send({ description: "cafe con leche" })
            .expect(200);

        expect(res.body.data.description).toBe("cafe con leche");
        expect(String(res.body.data.id)).toBe(String(created.body.data.id));

        await pool.query("DELETE FROM expenses WHERE id = $1", [created.body.data.id]);
    });
    it("404 when expense does not exist", async () => {
        const a = await registerAndLogin();

        await request(app)
            .patch("/api/v1/expenses/999999999")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ description: "x" })
            .expect(404);
    });
    it("404 when editing someone else's expense", async () => {
        const a = await registerAndLogin();
        const b = await registerAndLogin();

        const created = await request(app).post("/api/v1/expenses")
            .set("Authorization", `Bearer ${a.token}`)
            .send({ amount_cents: 100, description: "notYours" })
            .expect(201);

        await request(app)
            .patch(`/api/v1/expenses/${created.body.data.id}`)
            .set("Authorization", `Bearer ${b.token}`)
            .send({ description: "hacked" })
            .expect(404);

        await pool.query("DELETE FROM expenses WHERE id = $1", [created.body.data.id]);
    });
})