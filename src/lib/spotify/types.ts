import { z } from "zod";

export const SpotifyCallbackResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    scope: z.string(),
    expires_in: z.number(),
    refresh_token: z.string(),
  });


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
  