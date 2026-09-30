import { findById, flagStats, listFlags } from "@repo/db";
import { enqueueInvestigation } from "@repo/queue";
import { AuthUser, ForbiddenError } from "@repo/types";
import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

const requireAdmin = async (request: FastifyRequest) => {
  const { id } = request.user as AuthUser;
  const user = await findById(id);
  if (user?.role !== "admin") {
    throw new ForbiddenError("Admin only", "ADMIN_ONLY");
  }
};

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAdmin);

  // What was flagged and why: score, raw features, per-feature contributions, verdict.
  app.get("/flags", async (request) => {
    const { limit, offset } = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(25),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(request.query);
    return { items: await listFlags(limit, offset), daily: await flagStats() };
  });

  app.post("/flags/:id/investigate", async (request, reply) => {
    const { id } = z.object({ id: z.uuid() }).parse(request.params);
    await enqueueInvestigation(id);
    return reply.code(202).send({ queued: true });
  });
};
