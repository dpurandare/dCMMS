import "@fastify/jwt";
import { UserPayload, RefreshTokenPayload } from "../services/auth.service";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: UserPayload | RefreshTokenPayload;
    user: UserPayload | RefreshTokenPayload;
  }
}
