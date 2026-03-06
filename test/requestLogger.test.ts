import { app } from "../src/app"
import request from "supertest"

afterEach(() => {
    jest.restoreAllMocks();
});

describe("requestLogger", () => {
    it("logs request data for a successful request", async () => {
        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => { });

        await request(app)
            .get("/api/v1/health")
            .set("x-request-id", "test-123")
            .expect(200);

        expect(infoSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: "test-123",
                method: "GET",
                path: "/api/v1/health",
                statusCode: 200,
                durationMs: expect.any(Number),
            })
        );
    });
    it("logs request data for a 404 response", async () => {
        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => { });

        await request(app)
            .get("/api/v1/does-not-exist")
            .set("x-request-id", "test-404")
            .expect(404);

        expect(infoSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: "test-404",
                method: "GET",
                path: "/api/v1/does-not-exist",
                statusCode: 404,
                durationMs: expect.any(Number),
            })
        );
    });
    it("logs request data for a 400 validation response", async () => {
        const infoSpy = jest.spyOn(console, "info").mockImplementation(() => { });

        await request(app)
            .get("/api/v1/projects?page=0")
            .set("x-request-id", "test-400")
            .expect(400);

        expect(infoSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                requestId: "test-400",
                method: "GET",
                path: "/api/v1/projects?page=0",
                statusCode: 400,
                durationMs: expect.any(Number),
            })
        );
    });
});