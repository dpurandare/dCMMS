import { FastifyPluginAsync } from "fastify";

/**
 * DEPRECATED no-op (REV-018a, ADR-005). The CSRF token system was removed: endpoints authenticate
 * with an Authorization header, and the cookie endpoints use an Origin check instead
 * (middleware/origin-check.ts). This route stays for one release so a client outside this
 * repository that still fetches a token does not break. It returns a dummy token that nothing
 * validates and logs a warning so we can see whether anything still calls it.
 *
 * TODO (REV-018a): delete this file and its registration in server.ts in the next release, after
 * checking the logs for the deprecation warning.
 */
const csrfRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    "/token",
    {
      schema: {
        description: "DEPRECATED: CSRF tokens are no longer used. Returns a dummy token.",
        tags: ["csrf"],
        deprecated: true,
        response: {
          200: {
            type: "object",
            properties: {
              csrfToken: { type: "string" },
              expiresIn: { type: "number" },
              deprecated: { type: "boolean" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      request.log.warn(
        { userAgent: request.headers["user-agent"] },
        "DEPRECATED: GET /csrf/token called; CSRF tokens were removed and nothing validates this value",
      );
      return reply.send({ csrfToken: "deprecated-not-validated", expiresIn: 0, deprecated: true });
    },
  );
};

export default csrfRoutes;
