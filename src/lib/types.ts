import { z } from "zod";

export const LinkInitSchema = z.object({
  provider: z.enum(["SPOTIFY", "APPLE_MUSIC"]),
  client_type: z.enum(["AI_AGENT", "WEB"]).optional().default("WEB"),
});

export const LinkCallbackSchema = z.object({
  code: z.coerce.string(),
  state: z.coerce.string(),
});

export const SpotifyCallbackResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
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

export type ConcertsQuery = z.infer<typeof ConcertsQuerySchema>;

export const SpotifyFollowingResponseSchema = z.object({
  artists: z.object({
    href: z.string(),
    limit: z.number(),
    next: z.string().nullable(),
    cursors: z.object({
      after: z.string().nullable(),
    }),
    total: z.number(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      images: z.array(z.object({
        url: z.string(),
        height: z.number(),
        width: z.number(),
      })),
      popularity: z.number(),
      uri: z.string(),
    })),
  }),
});

export const SpotifyUserSchema = z.object({
  country: z.string().length(2), 
  display_name: z.string().nullable(),
  email: z.string().email(), 
  explicit_content: z.object({
    filter_enabled: z.boolean(),
    filter_locked: z.boolean(),
  }),
  external_urls: z.object({
    spotify: z.string().url(),
  }),
  followers: z.object({
    href: z.string().nullable(), 
    total: z.number().int().nonnegative(),
  }),
  href: z.url(),
  id: z.string(),
  images: z.array(
    z.object({
      url: z.url(),
      height: z.number().int().nullable(),
      width: z.number().int().nullable(),
    })
  ),
  product: z.enum(["premium", "free", "open"]),
  type: z.literal("user"),
  uri: z.string(),
});

// Type inference
export type SpotifyUser = z.infer<typeof SpotifyUserSchema>;