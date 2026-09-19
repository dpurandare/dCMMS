import { TestServer } from '../../tests/helpers/test-server';
import { db } from '../../tests/helpers/database';
import { UserFactory } from '../../tests/factories/user.factory';

describe('Forecast API E2E', () => {
    let server: TestServer;
    let token: string;
    let siteId: string;
    let assetId: string;
    let defaultTenant: any;

    beforeAll(async () => {
        await db.connect();
        server = new TestServer();
        await server.start();
    });

    afterAll(async () => {
        await server.stop();
        await db.disconnect();
    });

    beforeEach(async () => {
        await db.cleanAll();
        defaultTenant = await db.seedDefaultTenant();
        UserFactory.reset();

        // Setup: Create Admin User
        const user = await UserFactory.build({
            email: 'admin@dcmms.local',
            password: 'password123',
            role: 'super_admin',
            tenantId: defaultTenant.id
        });
        await db.insert('users', user);

        // Login
        const loginRes = await server.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: {
                email: 'admin@dcmms.local',
                password: 'password123'
            }
        });
        token = JSON.parse(loginRes.body).accessToken;

        // Create Site
        const siteRes = await server.inject({
            method: 'POST',
            url: '/api/v1/sites',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
                name: 'Test Solar Farm',
                location: 'Nevada, USA',
                capacityMw: 100,
                timezone: 'America/Los_Angeles'
            }
        });
        if (siteRes.statusCode !== 201) {
            console.error('Site creation failed:', siteRes.body);
        }
        siteId = JSON.parse(siteRes.body).id;

        // Create Asset
        const assetRes = await server.inject({
            method: 'POST',
            url: '/api/v1/assets',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
                tenantId: defaultTenant.id,
                siteId: siteId,
                assetTag: 'SOL-001',
                name: 'Solar Panel 1',
                type: 'SOLAR_PANEL',
                status: 'operational'
            }
        });
        assetId = JSON.parse(assetRes.body).id;
    });

    describe('POST /api/v1/forecasts/generation/generate', () => {
        it('should generate a forecast successfully', async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/forecasts/generation/generate',
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    siteId,
                    assetId,
                    forecastHorizonHours: 24,
                    modelType: 'sarima',
                    energyType: 'solar'
                }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.message).toBe('Forecast generated successfully');
            expect(body.forecastCount).toBeGreaterThan(0);
            expect(body.forecasts[0]).toHaveProperty('predictedGenerationMw');
        });

        it('should fail with invalid parameters', async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/forecasts/generation/generate',
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    siteId: 'invalid-uuid',
                    forecastHorizonHours: 24
                }
            });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/v1/forecasts/generation/:siteId', () => {
        it('should retrieve forecasts for a site', async () => {
            const res = await server.inject({
                method: 'GET',
                url: `/api/v1/forecasts/generation/${siteId}`,
                headers: { Authorization: `Bearer ${token}` }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(Array.isArray(body)).toBe(true);
        });
    });

    describe('POST /api/v1/forecasts/accuracy/calculate', () => {
        it('should calculate accuracy metrics', async () => {
            // 1. Generate a forecast
            const genRes = await server.inject({
                method: 'POST',
                url: '/api/v1/forecasts/generation/generate',
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    siteId,
                    assetId,
                    forecastHorizonHours: 24,
                    modelType: 'sarima',
                    energyType: 'solar'
                }
            });
            const forecasts = JSON.parse(genRes.body).forecasts;
            const forecastId = forecasts[0].id;

            // 2. Update with actuals
            await server.inject({
                method: 'PUT',
                url: `/api/v1/forecasts/generation/${forecastId}/actual`,
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    actualGenerationMw: 50
                }
            });

            // 3. Calculate accuracy
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/forecasts/accuracy/calculate',
                headers: { Authorization: `Bearer ${token}` },
                payload: {
                    siteId,
                    modelName: 'sarima', // Match the model used in generate
                    modelVersion: 'v1.0',
                    periodStart: new Date(Date.now() - 86400000).toISOString(), // 24h ago
                    periodEnd: new Date(Date.now() + 172800000).toISOString(), // 48h future (increased range)
                    forecastHorizonHours: 24
                }
            });

            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body).toHaveProperty('meanAbsolutePercentageError');
        });
    });
});
