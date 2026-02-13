import request from "supertest"
import { pool } from "../src/db"
import { app } from "../src/app"

describe("GET /api/v1/projects", () => {
    it("should return a list of projects", async () => {
        const response = await request(app).get("/api/v1/projects")
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("data")
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data[0]).toHaveProperty("id");
        expect(response.body.data[0]).toHaveProperty("price_cents");
        expect(response.body.data[0].name).toBe("Project A");

    })
    it("400 when limit is not a number", async () => {
        const response = await request(app).get("/api/v1/projects?limit=abc")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("400 when limit is not an integer", async () => {
        const response = await request(app).get("/api/v1/projects?limit=10.5")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })

    it("400 when page is not a number", async () => {
        const response = await request(app).get("/api/v1/projects?page=abc")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })

    it("400 when page is less than 1", async () => {
        const response = await request(app).get("/api/v1/projects?page=0")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })

    it("400 when limit exceeds max", async () => {
        const response = await request(app).get("/api/v1/projects?limit=21")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })

    it("400 when limit is less than 1", async () => {
        const response = await request(app).get("/api/v1/projects?limit=0")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })

    it("returns meta with page and limit", async () => {
        const response = await request(app).get("/api/v1/projects?page=2&limit=1")
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("meta.page", 2)
        expect(response.body).toHaveProperty("meta.limit", 1)
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe("Project B");
    })
    it("returns meta with total", async () => {
        const response = await request(app).get("/api/v1/projects?page=2&limit=1")
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("meta.total")
        expect(typeof response.body.meta.total).toBe("number")
        expect(response.body.meta.total).toBeGreaterThanOrEqual(response.body.data.length)
        expect(response.body.meta.total).toBeGreaterThan(0)
    })
})
describe("POST /api/v1/projects", () => {
    it("post created in db", async () => {
        const response = await request(app).post("/api/v1/projects").send({ name: "p_test", price_cents: 123 })
        expect(response.status).toBe(201)
        expect(response.body.data).toEqual(expect.objectContaining({ name: "p_test", price_cents: 123 }))
        expect(response.body.data.id).toBeDefined()
        await pool.query("DELETE FROM projects WHERE id = $1", [response.body.data.id]);

    })
    it("post no contain", async () => {
        const response = await request(app).post("/api/v1/projects").send({ name: "", price_cents: 123 })
        expect(response.status).toBe(400)
        expect(response.body.error).toBeDefined()
        expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })
    it("400 when price_cents is negative", async () => {
        const response = await request(app).post("/api/v1/projects").send({ name: "p_test_neg", price_cents: -1 })
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("400 when price_cents is missing", async () => {
        const response = await request(app).post("/api/v1/projects").send({ name: "p_test_null" })
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("GET /projects/:id -> 400 when id is not a positive integer", async () => {
        const response = await request(app).get("/api/v1/projects/abc")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("GET /projects/:id -> 404 when project does not exist", async () => {
        const response = await request(app).get("/api/v1/projects/999999")
        expect(response.status).toBe(404)
        expect(response.body).toHaveProperty("error.message", "Project not found")
    })
    it("creates a project and fetches it by id", async () => {
        const payload = { name: "test", price_cents: 1234 }
        const createRes = (await request(app).post("/api/v1/projects").send(payload))
        expect(createRes.status).toBe(201)
        const id = createRes.body.data.id
        expect(typeof id).toBe("number")
        const response = await request(app).get(`/api/v1/projects/${id}`)
        expect(response.status).toBe(200)
        expect(response.body.data).toEqual(expect.objectContaining({ id, ...payload }))
        await pool.query("DELETE FROM projects WHERE id = $1", [id]);
    })
})
describe("DELETE /api/v1/projects", () => {
    it("204 deletes an existing project", async () => {
        const create = await request(app).post("/api/v1/projects").send({ name: "tmp", price_cents: 123 })
        const id = create.body.data.id

        await request(app).delete(`/api/v1/projects/${id}`).expect(204)
        await request(app).get(`/api/v1/projects/${id}`).expect(404)

    })
    it("404 when project does not exist", async () => {
        await request(app).delete("/api/v1/projects/999999").expect(404)

    })
    it("400 when id is invalid", async () => {
        await request(app).delete("/api/v1/projects/abc").expect(400)
    })
})
describe("PUT /api/v1/projects/:id", () => {
    it("200 update project", async () => {
        const create = await request(app)
            .post("/api/v1/projects")
            .send({ name: "tmpput", price_cents: 123 })

        const id = create.body.data.id
        const response = await request(app)
            .put(`/api/v1/projects/${id}`)
            .send({ name: "tmpputexit", price_cents: 999 })
            expect(response.status).toBe(200)
            expect(response.body.data.id).toBe(id);
        expect(response.body.data).toEqual(expect.objectContaining({ name: "tmpputexit", price_cents: 999 }))
        await request(app).delete(`/api/v1/projects/${id}`);
    })
    it("PUT 400 id = abc", async () => {
        await request(app).put("/api/v1/projects/abc").send({ name: "x", price_cents: 123 }).expect(400)
    })
    it("400 body invalid", async () => {
        const create = await request(app)
            .post("/api/v1/projects")
            .send({ name: "400id", price_cents: 123 })
        const id = create.body.data.id
        await request(app).put(`/api/v1/projects/${id}`).send({ name: "", price_cents: 123 }).expect(400)
        await request(app).delete(`/api/v1/projects/${id}`);
    })
    it("404 id not found", async () => {
        await request(app).put("/api/v1/projects/999999").send({ name: "x", price_cents: 123 }).expect(404)
    })
})