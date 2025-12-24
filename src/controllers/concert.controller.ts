import { Request, Response } from "express";
import { ConcertsQuerySchema } from "../lib/types";
import prisma from "../lib/prisma";
import { decryptToken, encryptToken, hash } from "../lib/crypto";
import { getSpotifyFollowing, getSpotifyTopArtists, refreshSpotifyAccessToken } from "../lib/spotify";
import { resolveArtistNames } from "../lib/artist-matcher";
import { AppError } from "../lib/errors";

export const test = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ message: "Test route" });
};

export const getConcerts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    link_session_token,
    lat,
    lng,
    radius_km,
    start_date,
    end_date,
    limit,
  } = ConcertsQuerySchema.parse(req.query);

  const session = await prisma.linkSession.findUniqueOrThrow({
    where: {
      tokenHash: hash(link_session_token),
    },
    include: {
      linkedAccount: true,
    },
  });

  if (session.status !== "CONNECTED") {
    throw new AppError("Link session not connected", 400);
  }

  if (session.expiresAt < new Date()) {
    throw new AppError("Link session expired", 400);
  }

  if (session.linkedAccount === null) {
    throw new AppError("Linked account not found", 400);
  }

  // Check if access token is expired and refresh if needed
  let accessToken = decryptToken({
    ciphertext: session.linkedAccount.accessToken,
    iv: session.linkedAccount.accessTokenIv,
    tag: session.linkedAccount.accessTokenTag,
  });

  if (session.linkedAccount.accessTokenExpiresAt < new Date()) {
    // Token is expired, refresh it
    const refreshToken = decryptToken({
      ciphertext: session.linkedAccount.refreshToken,
      iv: session.linkedAccount.refreshTokenIv,
      tag: session.linkedAccount.refreshTokenTag,
    });

    const { access_token: accessToken, expires_in } =
      await refreshSpotifyAccessToken(refreshToken);

    // Encrypt and save new access token
    const accessTokenEnc = encryptToken(accessToken);
    await prisma.linkedAccount.update({
      where: { id: session.linkedAccount.id },
      data: {
        accessToken: accessTokenEnc.ciphertext,
        accessTokenIv: accessTokenEnc.iv,
        accessTokenTag: accessTokenEnc.tag,
        accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });
  }

  // TODO combine data from top artists and followed artists
  const topArtists = await getSpotifyTopArtists(accessToken, {
    limit,
    time_range: "long_term",
  });
  const topArtistNames = topArtists.items.map((artist) => artist.name);

  const followed = await getSpotifyFollowing(accessToken, limit);
  const followedArtistNames = followed.artists.items.map((artist) => artist.name);

  // Combine and deduplicate artist names
  const artistNames = [...new Set([...topArtistNames, ...followedArtistNames])];

  if (artistNames.length === 0) {
    res.status(200).json({ data: [] });
    return;
  }

  // Resolve artist names to attraction IDs in our database
  const resolvedAttractions = await resolveArtistNames(artistNames);

  if (resolvedAttractions.length === 0) {
    res.status(200).json({
      data: [],
      message:
        "No concerts found for your followed artists in the selected area",
    });
    return;
  }

  const attractionIds = resolvedAttractions.map((a) => a.id);

  // Calculate distance for geo filtering
  const earthRadiusKm = 6371;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  // Query local database for concerts
  const events = await prisma.event.findMany({
    where: {
      isTest: false,
      startDate: {
        gte: new Date(start_date),
        lte: new Date(end_date),
      },
      eventAttractions: {
        some: {
          attractionId: {
            in: attractionIds,
          },
        },
      },
    },
    include: {
      venue: true,
      eventAttractions: {
        include: {
          attraction: true,
        },
      },
    },
    orderBy: {
      startDate: "asc",
    },
  });

  // Filter by distance and format response
  const concertsWithDistance = events
    .map((event) => {
      if (!event.venue.latitude || !event.venue.longitude) {
        return null;
      }

      const venueLat = event.venue.latitude;
      const venueLng = event.venue.longitude;
      const venueLatRad = (venueLat * Math.PI) / 180;
      const venueLngRad = (venueLng * Math.PI) / 180;

      // Haversine formula
      const dLat = venueLatRad - latRad;
      const dLng = venueLngRad - lngRad;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latRad) *
          Math.cos(venueLatRad) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = earthRadiusKm * c;

      if (distanceKm > radius_km) {
        return null;
      }

      return {
        id: event.id,
        name: event.name,
        url: event.url,
        imageUrl: event.imageUrl,
        startDate: event.startDate,
        startDateTime: event.startDateTime,
        timezone: event.timezone,
        onsaleStartDate: event.onsaleStartDate,
        onsaleEndDate: event.onsaleEndDate,
        minPrice: event.minPrice,
        maxPrice: event.maxPrice,
        currency: event.currency,
        genre: event.genreName,
        segment: event.segmentName,
        distance: Math.round(distanceKm * 10) / 10,
        venue: {
          id: event.venue.id,
          name: event.venue.name,
          city: event.venue.city,
          state: event.venue.state,
          country: event.venue.country,
          address: event.venue.address,
          latitude: event.venue.latitude,
          longitude: event.venue.longitude,
        },
        artists: event.eventAttractions.map((ea) => ({
          id: ea.attraction.id,
          name: ea.attraction.name,
          imageUrl: ea.attraction.imageUrl,
        })),
        source: event.source,
      };
    })
    .filter((concert) => concert !== null)
    .slice(0, limit);

  res.status(200).json({
    data: concertsWithDistance,
    meta: {
      total: concertsWithDistance.length,
      artistsQueried: artistNames.length,
      artistsMatched: resolvedAttractions.length,
    },
  });
};
