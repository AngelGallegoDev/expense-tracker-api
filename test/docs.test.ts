import request from "supertest"
import { app } from "../src/app"

it("GET /docs serves Swagger UI", async () => {
  const res = await request(app).get("/docs/").expect(200)
  expect(res.text.toLowerCase()).toContain("swagger")
})
it("GET /docs redirects to /docs/", async () => {
  const res = await request(app).get("/docs").expect(301)
  expect(res.headers.location).toBe("/docs/")
})