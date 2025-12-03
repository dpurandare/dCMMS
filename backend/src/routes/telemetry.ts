import { FastifyPluginAsync } from "fastify";
import { kafkaService } from "../services/kafka.service";
import { Pool } from "pg";

const telemetryRoutes: FastifyPluginAsync = async (server) => {
  // QuestDB connection pool
  const questdb = new Pool({
    host: process.env.QUESTDB_HOST || "localhost",
    port: parseInt(process.env.QUESTDB_PORT || "8812"),
    user: process.env.QUESTDB_USER || "admin",
    password: process.env.QUESTDB_PASSWORD || "quest",
    database: process.env.QUESTDB_DATABASE || "qdb",
  });

  // POST /api/v1/telemetry - Ingest telemetry events
  server.post(
    "/",
    {
      schema: {
        description: "Ingest batch telemetry events",
        tags: ["telemetry"],
        security: [{ bearerAuth: [] }],
        body: {
          type: "array",
          items: {
            type: "object",
            required: [
              "timestamp",
              "site_id",
              "asset_id",
              "sensor_type",
              "sensor_id",
              "value",
              "unit",
            ],
            properties: {
              event_id: { type: "string" },
              timestamp: {
                type: "number",
                description: "Unix timestamp in milliseconds",
              },
              site_id: { type: "string" },
              asset_id: { type: "string" },
              sensor_type: {
                type: "string",
                enum: [
                  "TEMPERATURE",
                  "VOLTAGE",
                  "CURRENT",
                  "POWER",
                  "FREQUENCY",
                  "PRESSURE",
                  "HUMIDITY",
                  "VIBRATION",
                  "FLOW_RATE",
                  "RPM",
                  "TORQUE",
                  "ENERGY",
                  "STATUS",
                  "OTHER",
                ],
              },
              sensor_id: { type: "string" },
              value: { type: "number" },
              unit: { type: "string" },
              quality_flag: {
                type: "string",
                enum: [
                  "GOOD",
                  "BAD",
                  "UNCERTAIN",
                  "OUT_OF_RANGE",
                  "SENSOR_FAULT",
                ],
                default: "GOOD",
              },
              metadata: { type: "object" },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              accepted: { type: "number" },
              rejected: { type: "number" },
              errors: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const events = request.body as any[];
      const user = request.user as any;

      const accepted: any[] = [];
      const rejected: any[] = [];
      const errors: any[] = [];

      // Validate and enrich events
      for (const event of events) {
        try {
          // Generate event_id if not provided
          if (!event.event_id) {
            event.event_id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          }

          // Add metadata
          event.tenant_id = user.tenantId;
          event.source = "REST_API";
          event.schema_version = "1.0.0";
          event.ingested_at = Date.now();

          // Basic validation
          if (event.value < -1e9 || event.value > 1e9) {
            throw new Error("Value out of range");
          }

          if (!event.quality_flag) {
            event.quality_flag = "GOOD";
          }

          accepted.push(event);
        } catch (error: any) {
          rejected.push(event);
          errors.push({
            event_id: event.event_id,
            error: error.message,
          });
        }
      }

      // Publish accepted events to Kafka
      if (accepted.length > 0) {
        try {
          await kafkaService.publishTelemetry("raw_telemetry", accepted);
        } catch (error: any) {
          server.log.error("Failed to publish to Kafka:", error);
          return reply.status(500).send({
            statusCode: 500,
            error: "Internal Server Error",
            message: "Failed to publish telemetry events",
          });
        }
      }

      return {
        accepted: accepted.length,
        rejected: rejected.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  );

  // GET /api/v1/telemetry - Query telemetry data
  server.get(
    "/",
    {
      schema: {
        description: "Query sensor readings from QuestDB",
        tags: ["telemetry"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            site_id: { type: "string" },
            asset_id: { type: "string" },
            sensor_type: { type: "string" },
            sensor_id: { type: "string" },
            start_time: {
              type: "string",
              description: "ISO 8601 timestamp or Unix ms",
            },
            end_time: {
              type: "string",
              description: "ISO 8601 timestamp or Unix ms",
            },
            aggregation: {
              type: "string",
              enum: ["raw", "1min", "5min", "15min", "1hour"],
              default: "raw",
            },
            limit: { type: "number", default: 1000, maximum: 10000 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "string" },
                    value: { type: "number" },
                    unit: { type: "string" },
                    sensor_id: { type: "string" },
                    quality_flag: { type: "string" },
                  },
                },
              },
              count: { type: "number" },
              aggregation: { type: "string" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const query = request.query as any;
      const user = request.user as any;

      // DCMMS-059: Use pre-computed aggregation tables for better performance
      // Choose appropriate table based on aggregation level
      const aggregationTableMap: Record<string, string> = {
        raw: "sensor_readings",
        "1min": "sensor_readings_1min",
        "5min": "sensor_readings_5min",
        "15min": "sensor_readings_15min",
        "1hour": "sensor_readings_1hour",
      };

      const aggregationLevel = query.aggregation || "raw";
      const tableName =
        aggregationTableMap[aggregationLevel] || "sensor_readings";
      const useAggregationTable = aggregationLevel !== "raw";

      // Select appropriate columns based on table type
      let selectColumns: string;
      if (useAggregationTable) {
        // Aggregation tables have pre-computed metrics
        selectColumns =
          "timestamp, site_id, asset_id, sensor_type, sensor_id, value_avg as value, value_min, value_max, unit, good_count, bad_count, out_of_range_count";
      } else {
        // Raw table has individual readings
        selectColumns =
          "timestamp, site_id, asset_id, sensor_type, sensor_id, value, unit, quality_flag";
      }

      // Build SQL query
      let sql = `SELECT ${selectColumns} FROM ${tableName} WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (query.site_id) {
        sql += ` AND site_id = $${paramIndex}`;
        params.push(query.site_id);
        paramIndex++;
      }

      if (query.asset_id) {
        sql += ` AND asset_id = $${paramIndex}`;
        params.push(query.asset_id);
        paramIndex++;
      }

      if (query.sensor_type) {
        sql += ` AND sensor_type = $${paramIndex}`;
        params.push(query.sensor_type);
        paramIndex++;
      }

      if (query.sensor_id) {
        sql += ` AND sensor_id = $${paramIndex}`;
        params.push(query.sensor_id);
        paramIndex++;
      }

      // Time range filter
      if (query.start_time) {
        const startTime = new Date(query.start_time).getTime();
        sql += ` AND timestamp >= to_timestamp($${paramIndex})`;
        params.push(startTime);
        paramIndex++;
      }

      if (query.end_time) {
        const endTime = new Date(query.end_time).getTime();
        sql += ` AND timestamp <= to_timestamp($${paramIndex})`;
        params.push(endTime);
        paramIndex++;
      }

      // Order and limit
      sql += ` ORDER BY timestamp DESC LIMIT ${query.limit || 1000}`;

      try {
        const queryStart = Date.now();
        const result = await questdb.query(sql, params);
        const queryDuration = Date.now() - queryStart;

        // Log performance metrics
        server.log.info(
          {
            table: tableName,
            aggregation: aggregationLevel,
            rowCount: result.rows.length,
            durationMs: queryDuration,
          },
          "Telemetry query completed",
        );

        // Map results based on table type
        const data = result.rows.map((row: any) => {
          if (useAggregationTable) {
            return {
              timestamp: row.timestamp,
              value: parseFloat(row.value),
              value_min: parseFloat(row.value_min),
              value_max: parseFloat(row.value_max),
              unit: row.unit,
              sensor_id: row.sensor_id,
              good_count: parseInt(row.good_count),
              bad_count: parseInt(row.bad_count),
              out_of_range_count: parseInt(row.out_of_range_count),
            };
          } else {
            return {
              timestamp: row.timestamp,
              value: parseFloat(row.value),
              unit: row.unit,
              sensor_id: row.sensor_id,
              quality_flag: row.quality_flag,
            };
          }
        });

        return {
          data,
          count: result.rows.length,
          aggregation: aggregationLevel,
          table_used: tableName,
          query_duration_ms: queryDuration,
        };
      } catch (error: any) {
        server.log.error("Failed to query QuestDB:", error);
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Failed to query telemetry data",
        });
      }
    },
  );

  // GET /api/v1/telemetry/stats - Get telemetry statistics
  server.get(
    "/stats",
    {
      schema: {
        description: "Get telemetry statistics for an asset",
        tags: ["telemetry"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          required: ["asset_id"],
          properties: {
            asset_id: { type: "string" },
            start_time: { type: "string" },
            end_time: { type: "string" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              asset_id: { type: "string" },
              total_readings: { type: "number" },
              sensor_types: { type: "array" },
              time_range: { type: "object" },
            },
          },
        },
      },
      preHandler: server.authenticate,
    },
    async (request, reply) => {
      const query = request.query as any;

      try {
        let sql = `
          SELECT
            sensor_type,
            count(*) as count,
            min(value) as min_value,
            max(value) as max_value,
            avg(value) as avg_value,
            min(timestamp) as first_reading,
            max(timestamp) as last_reading
          FROM sensor_readings
          WHERE asset_id = $1
        `;
        const params: any[] = [query.asset_id];

        if (query.start_time) {
          sql += ` AND timestamp >= to_timestamp($2)`;
          params.push(new Date(query.start_time).getTime());
        }

        if (query.end_time) {
          sql += ` AND timestamp <= to_timestamp($${params.length + 1})`;
          params.push(new Date(query.end_time).getTime());
        }

        sql += ` GROUP BY sensor_type`;

        const result = await questdb.query(sql, params);

        return {
          asset_id: query.asset_id,
          total_readings: result.rows.reduce(
            (sum: number, row: any) => sum + parseInt(row.count),
            0,
          ),
          sensor_types: result.rows.map((row: any) => ({
            type: row.sensor_type,
            count: parseInt(row.count),
            min_value: parseFloat(row.min_value),
            max_value: parseFloat(row.max_value),
            avg_value: parseFloat(row.avg_value),
            first_reading: row.first_reading,
            last_reading: row.last_reading,
          })),
          time_range: {
            start: query.start_time || result.rows[0]?.first_reading,
            end: query.end_time || result.rows[0]?.last_reading,
          },
        };
      } catch (error: any) {
        server.log.error("Failed to get telemetry stats:", error);
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: "Failed to get telemetry statistics",
        });
      }
    },
  );

  // Cleanup on server close
  server.addHook("onClose", async () => {
    await questdb.end();
    await kafkaService.disconnect();
  });
};

export default telemetryRoutes;
