import request=require("supertest")
import {app} from "../src/app"

describe("GET /projects", () => {
    it("should return a list of projects", async () => {
        const response = await request(app).get("/projects")
        expect(response.status).toBe(200)
        expect(response.body).toEqual([{data: {
            id: 1,
            name: "Mochila",
            precio: 45.99
        }}])
    })
})