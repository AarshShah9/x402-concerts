import { z } from "zod";

export const LinkInitSchema = z
  .object({
    provider: z.enum(["SPOTIFY", "APPLE_MUSIC"]),
    client_type: z.enum(["AI_AGENT", "WEB"]).optional().default("WEB"),
    link_session_token: z.string().min(1).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.link_session_token && v.client_type !== "AI_AGENT") {
      ctx.addIssue({
        code: "custom",
        path: ["link_session_token"],
        message:
          "link_session_token can only be provided for AI_AGENT client type",
      });
    }
  });

export const LinkCallbackSchema = z.object({
  code: z.coerce.string(),
  state: z.coerce.string(),
});

export const ConcertsQuerySchema = z
  .object({
    link_session_token: z.string().min(1),

    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),

    radius_km: z.coerce.number().positive(),

    // Keep as YYYY-MM-DD strings (no timezones)
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    limit: z.coerce.number().int().positive().max(100).default(25),

    refresh: z.coerce.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.end_date < v.start_date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "end_date must be on or after start_date",
      });
    }
  });
