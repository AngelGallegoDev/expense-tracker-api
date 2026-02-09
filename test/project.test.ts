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

})  