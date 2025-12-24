import { Request, Response } from "express";
import { ConcertsQuerySchema } from "../lib/types";
import prisma from "../lib/prisma";
import { decryptToken, encryptToken, hash } from "../lib/crypto";
import { getSpotifyFollowing, refreshSpotifyAccessToken } from "../lib/spotify";
import { getTicketmasterConcerts } from "../lib/ticketmaster";
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
    refresh,
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
  // const artists = await spotifyApiClient(accessToken).get(`me/top/artists?limit=${limit}&time_range=long_term`);
  const followed = await getSpotifyFollowing(accessToken, limit);
  const artists = [...followed.artists.items];
  const concerts = await getTicketmasterConcerts({
    keyword: artists[3]?.name!,
  });
  res.status(200).json({ data: concerts });
};
