import request from 'supertest';
import { app } from '../../src/server';
import { db } from '../../src/db';
import { sites, assets } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

describe('Forecast API E2E', () => {
    let siteId: string;
    let assetId: string;
    let token: string;

    beforeAll(async () => {
        // 1. Login to get token
        const loginRes = await request(app.server)
            .post('/api/v1/auth/login')
            .send({
                email: 'admin@dcmms.local',
                password: 'password123'
            });
        token = loginRes.body.token;

        // 2. Create a test site
        const siteRes = await request(app.server)
            .post('/api/v1/sites')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Solar Farm',
                location: 'Nevada, USA',
                capacityMw: 100,
                timezone: 'America/Los_Angeles'
            });
        siteId = siteRes.body.id;

        // 3. Create a test asset
        const assetRes = await request(app.server)
            .post('/api/v1/assets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                tenantId: '00000000-0000-0000-0000-000000000001',
                siteId: siteId,
                assetTag: 'SOL-001',
                name: 'Solar Panel 1',
                type: 'SOLAR_PANEL',
                status: 'operational'
            });
        assetId = assetRes.body.id;
    });

    afterAll(async () => {
        // Cleanup
        if (assetId) await db.delete(assets).where(eq(assets.id, assetId));
        if (siteId) await db.delete(sites).where(eq(sites.id, siteId));
    });

    describe('POST /api/v1/forecasts/generation/generate', () => {
        it('should generate a forecast successfully', async () => {
            const res = await request(app.server)
                .post('/api/v1/forecasts/generation/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    siteId,
                    assetId,
                    forecastHorizonHours: 24,
                    modelType: 'sarima',
                    energyType: 'solar'
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Forecast generated successfully');
            expect(res.body.forecastCount).toBeGreaterThan(0);
            expect(res.body.forecasts[0]).toHaveProperty('predictedGenerationMw');
        });

        it('should fail with invalid parameters', async () => {
            const res = await request(app.server)
                .post('/api/v1/forecasts/generation/generate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    siteId: 'invalid-uuid',
                    forecastHorizonHours: 24
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/forecasts/generation/:siteId', () => {
        it('should retrieve forecasts for a site', async () => {
            const res = await request(app.server)
                .get(`/api/v1/forecasts/generation/${siteId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Should contain the forecast we just generated
            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/v1/forecasts/accuracy/calculate', () => {
        it('should calculate accuracy metrics', async () => {
            const res = await request(app.server)
                .post('/api/v1/forecasts/accuracy/calculate')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    siteId,
                    modelName: 'arima_solar',
                    modelVersion: 'v1.0',
                    periodStart: new Date().toISOString(),
                    periodEnd: new Date().toISOString(),
                    forecastHorizonHours: 24
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('meanAbsolutePercentageError');
        });
    });
});
