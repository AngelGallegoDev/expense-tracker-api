import request from "supertest"
import { app } from "../src/app"

it("GET /docs serves Swagger UI", async () => {
  const res = await request(app).get("/docs/").expect(200)
  expect(res.text.toLowerCase()).toContain("swagger")
})

