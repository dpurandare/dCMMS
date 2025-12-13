import Fastify, { FastifyInstance } from "fastify";
import { createKPICalculationService } from "../../src/services/kpi-calculation.service";

// Mock the KPI service factory
jest.mock("../../src/services/kpi-calculation.service");

// Mock fastify-type-provider-zod to avoid validation issues in test
jest.mock("fastify-type-provider-zod", () => ({
    validatorCompiler: () => () => ({ value: {} }),
    serializerCompiler: () => (value: any) => JSON.stringify(value),
}));

describe("Analytics Trends API", () => {
    let server: FastifyInstance;
    const mockCalculateKPIs = jest.fn();

    beforeAll(async () => {
        // Setup the mock before the server uses it
        (createKPICalculationService as jest.Mock).mockReturnValue({
            calculateKPIs: mockCalculateKPIs,
        });

        server = Fastify();

        // Mock the authenticate decorator
        server.decorate("authenticate", async (request: any, reply: any) => {
            // Authenticate mock - pass through or set user
            request.user = {
                tenantId: "test-tenant-id",
                id: "test-user-id",
                email: "test@example.com",
                username: "testuser",
                role: "admin",
            };
        });

        // Register valid type compilers to avoid errors if Zod is used
        server.setValidatorCompiler(() => () => ({ value: {} }));
        server.setSerializerCompiler(() => () => JSON.stringify({}));

        // Register routes
        server.register(require("../../src/routes/analytics").default);

        await server.ready();
    });

    afterAll(async () => {
        await server.close();
    });

    beforeEach(() => {
        mockCalculateKPIs.mockReset();
    });

    it("should calculate trends correctly when current > previous", async () => {
        // Current period KPIs
        mockCalculateKPIs.mockResolvedValueOnce({
            mttr: 10,
            mtbf: 100,
            completionRate: 90,
            availability: 99,
            period: { startDate: new Date(), endDate: new Date() },
        });

        // Previous period KPIs (lower values to show increase)
        mockCalculateKPIs.mockResolvedValueOnce({
            mttr: 8,
            mtbf: 80,
            completionRate: 80,
            availability: 90,
            period: { startDate: new Date(), endDate: new Date() },
        });

        const response = await server.inject({
            method: "GET",
            url: "/analytics/kpis",
        });

        if (response.statusCode !== 200) {
            console.error("DEBUG: Response payload:", response.payload);
        }
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        // Verify current values are returned
        expect(body.mttr).toBe(10);

        // Verify trends
        expect(body.summaryTrends).toBeDefined();

        // MTTR: (10 - 8) / 8 = 0.25 = 25% (UP)
        expect(body.summaryTrends.mttr).toEqual({
            value: 25.0,
            direction: "up"
        });

        // MTBF: (100 - 80) / 80 = 0.25 = 25% (UP)
        expect(body.summaryTrends.mtbf).toEqual({
            value: 25.0,
            direction: "up"
        });
    });

    it("should calculate trends correctly when current < previous", async () => {
        // Current
        mockCalculateKPIs.mockResolvedValueOnce({
            mttr: 5,
            mtbf: 50,
            completionRate: 50,
            availability: 50,
            period: { startDate: new Date(), endDate: new Date() },
        });

        // Previous
        mockCalculateKPIs.mockResolvedValueOnce({
            mttr: 10,
            mtbf: 100,
            completionRate: 100,
            availability: 100,
            period: { startDate: new Date(), endDate: new Date() },
        });

        const response = await server.inject({
            method: "GET",
            url: "/analytics/kpis",
        });

        const body = JSON.parse(response.payload);

        // MTTR: (5 - 10) / 10 = -0.5 = 50% (DOWN)
        expect(body.summaryTrends.mttr).toEqual({
            value: 50.0,
            direction: "down"
        });
    });
});
