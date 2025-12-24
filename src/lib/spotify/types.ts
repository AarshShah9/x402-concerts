import { z } from "zod";

export const SpotifyTokenResponseSchema = z.object({
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
    items: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        images: z.array(
          z.object({
            url: z.string(),
            height: z.number(),
            width: z.number(),
          }),
        ),
        popularity: z.number(),
        uri: z.string(),
      }),
    ),
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
    }),
  ),
  product: z.enum(["premium", "free", "open"]),
  type: z.literal("user"),
  uri: z.string(),
});

export type SpotifyTopArtistParams = {
  time_range?: "long_term" | "medium_term" | "short_term";
  limit?: number;
  offset?: number;
}

const ExternalUrls = z.record(z.string(), z.string());

const ImageObject = z.object({
  url: z.string(),
  height: z.number().nullable(),
  width: z.number().nullable(),
});

const FollowersObject = z.object({
  href: z.string().nullable(),
  total: z.number(),
});

const SimplifiedArtistObject = z.object({
  external_urls: ExternalUrls,
  href: z.string(),
  id: z.string(),
  name: z.string(),
  type: z.literal("artist"),
  uri: z.string(),
});

export const ArtistObject = z.object({
  external_urls: ExternalUrls,
  followers: FollowersObject,
  genres: z.array(z.string()),
  href: z.string(),
  id: z.string(),
  images: z.array(ImageObject),
  name: z.string(),
  popularity: z.number().min(0).max(100),
  type: z.literal("artist"),
  uri: z.string(),
});

const AlbumObject = z.object({
  album_type: z.enum(["album", "single", "compilation"]),
  total_tracks: z.number(),
  available_markets: z.array(z.string()),
  external_urls: ExternalUrls,
  href: z.string(),
  id: z.string(),
  images: z.array(ImageObject),
  name: z.string(),
  release_date: z.string(),
  release_date_precision: z.enum(["year", "month", "day"]),
  restrictions: z.object({ reason: z.string() }).optional(),
  type: z.literal("album"),
  uri: z.string(),
  artists: z.array(SimplifiedArtistObject),
});

export const TrackObject = z.object({
  album: AlbumObject,
  artists: z.array(SimplifiedArtistObject),
  available_markets: z.array(z.string()),
  disc_number: z.number(),
  duration_ms: z.number(),
  explicit: z.boolean(),
  external_ids: z
    .object({
      isrc: z.string().optional(),
      ean: z.string().optional(),
      upc: z.string().optional(),
    })
    .optional(),
  external_urls: ExternalUrls,
  href: z.string(),
  id: z.string(),
  is_playable: z.boolean().optional(),
  linked_from: z.any().optional(),
  restrictions: z
    .object({
      reason: z.string(),
    })
    .optional(),
  name: z.string(),
  popularity: z.number().min(0).max(100),
  preview_url: z.string().nullable(),
  track_number: z.number(),
  type: z.literal("track"),
  uri: z.string(),
  is_local: z.boolean(),
});

export const SpotifyTopArtistsTrackResponseSchema = z.object({
  href: z.string(),
  limit: z.number(),
  next: z.string().nullable(),
  offset: z.number(),
  previous: z.string().nullable(),
  total: z.number(),
  items: z.array(z.union([ArtistObject, TrackObject])),
});
