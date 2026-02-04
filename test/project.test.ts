import request = require("supertest")
import { app } from "../src/app"

describe("GET /projects", () => {
    it("should return a list of projects", async () => {
        const response = await request(app).get("/projects")
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("data")
        expect(Array.isArray(response.body.data)).toBe(true)
        expect(response.body.data[0]).toMatchObject({ id: 1, name: "Mochila", precio: 45.99 });
    })
    it("400 when limit is not a number", async () => {
        const response = await request(app).get("/projects?limit=abc")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("400 when limit is not an integer", async () => {
        const response = await request(app).get("/projects?limit=10.5")
        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty("error.code", "VALIDATION_ERROR")
    })
    it("returns meta with page and limit", async () => {
        const response = await request(app).get("/projects?page=2&limit=1")
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("meta.page", 2)
        expect(response.body).toHaveProperty("meta.limit", 1)
    })
})