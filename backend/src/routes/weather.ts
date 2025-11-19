import { FastifyPluginAsync } from 'fastify';
import { weatherAPIService } from '../services/weather-api.service';

const weatherRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/v1/weather/current/:siteId
  server.get(
    '/current/:siteId',
    {
      schema: {
        description: 'Get current weather for a site',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              siteId: { type: 'string' },
              forecastTimestamp: { type: 'string', format: 'date-time' },
              temperatureC: { type: 'number' },
              windSpeedMs: { type: 'number' },
              windDirectionDeg: { type: 'number' },
              cloudCoverPercent: { type: 'number' },
              weatherCondition: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };

      // In production, fetch site lat/lon from database
      // For now, using placeholder coordinates
      const siteLocation = {
        siteId,
        latitude: 28.6139, // Delhi, India (placeholder)
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      };

      const weather = await weatherAPIService.fetchCurrentWeather(siteLocation);

      return reply.code(200).send(weather);
    }
  );

  // GET /api/v1/weather/forecast/:siteId
  server.get(
    '/forecast/:siteId',
    {
      schema: {
        description: 'Get 5-day weather forecast for a site',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                siteId: { type: 'string' },
                forecastTimestamp: { type: 'string', format: 'date-time' },
                temperatureC: { type: 'number' },
                windSpeedMs: { type: 'number' },
                windDirectionDeg: { type: 'number' },
                cloudCoverPercent: { type: 'number' },
                weatherCondition: { type: 'string' },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };

      // In production, fetch site lat/lon from database
      const siteLocation = {
        siteId,
        latitude: 28.6139, // Delhi, India (placeholder)
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      };

      const forecasts = await weatherAPIService.fetchForecast(siteLocation);

      return reply.code(200).send(forecasts);
    }
  );

  // GET /api/v1/weather/stored/:siteId
  server.get(
    '/stored/:siteId',
    {
      schema: {
        description: 'Get stored weather forecasts for a site within a date range',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            forecastType: {
              type: 'string',
              enum: ['historical', 'current', 'forecast'],
            },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                siteId: { type: 'string' },
                forecastTimestamp: { type: 'string', format: 'date-time' },
                fetchedAt: { type: 'string', format: 'date-time' },
                temperatureC: { type: 'number' },
                windSpeedMs: { type: 'number' },
                windDirectionDeg: { type: 'number' },
                cloudCoverPercent: { type: 'number' },
                weatherCondition: { type: 'string' },
              },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };
      const { startDate, endDate, forecastType } = request.query as {
        startDate: string;
        endDate: string;
        forecastType?: 'historical' | 'current' | 'forecast';
      };

      const forecasts = await weatherAPIService.getWeatherForecasts(
        siteId,
        new Date(startDate),
        new Date(endDate),
        forecastType
      );

      return reply.code(200).send(forecasts);
    }
  );

  // GET /api/v1/weather/latest/:siteId
  server.get(
    '/latest/:siteId',
    {
      schema: {
        description: 'Get latest weather forecast for a site',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              siteId: { type: 'string' },
              forecastTimestamp: { type: 'string', format: 'date-time' },
              temperatureC: { type: 'number' },
              windSpeedMs: { type: 'number' },
              weatherCondition: { type: 'string' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };

      const forecast = await weatherAPIService.getLatestWeatherForecast(siteId);

      if (!forecast) {
        return reply.code(404).send({ error: 'No weather forecast found for this site' });
      }

      return reply.code(200).send(forecast);
    }
  );

  // POST /api/v1/weather/refresh/:siteId
  server.post(
    '/refresh/:siteId',
    {
      schema: {
        description: 'Manually refresh weather data for a site',
        tags: ['weather'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['siteId'],
          properties: {
            siteId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              currentWeather: { type: 'object' },
              forecastCount: { type: 'number' },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const { siteId } = request.params as { siteId: string };

      // In production, fetch site lat/lon from database
      const siteLocation = {
        siteId,
        latitude: 28.6139, // Delhi, India (placeholder)
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      };

      // Fetch both current weather and forecast
      const currentWeather = await weatherAPIService.fetchCurrentWeather(siteLocation);
      const forecasts = await weatherAPIService.fetchForecast(siteLocation);

      return reply.code(200).send({
        message: 'Weather data refreshed successfully',
        currentWeather,
        forecastCount: forecasts.length,
      });
    }
  );
};

export default weatherRoutes;
