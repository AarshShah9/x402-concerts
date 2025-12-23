import { Request, Response } from "express";
import { LinkCallbackSchema, LinkInitSchema } from "../lib/types";
import prisma from "../lib/prisma";
import crypto from "crypto";
import { encryptToken, hash } from "../lib/crypto";
import { OAuthProvider } from "../../generated/prisma/client";
import {
  authenticateSpotify,
  generateSpotifyAuthUrl,
  getSpotifyUserInfo,
} from "../lib/spotify";
import { AppError } from "../lib/errors";

export const init = async (req: Request, res: Response): Promise<void> => {
  // validate request body
  const { provider, client_type } = LinkInitSchema.parse(req.body);

  // todo remove once we support more providers + get seperate service layers for different providers
  if (provider !== "SPOTIFY") {
    throw new AppError("Only SPOTIFY is supported for now", 400);
  }

  const oauthState = crypto.randomUUID();
  const oauthStateExp = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 minutes
  const rawSessionToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hash(rawSessionToken);
  const authUrl = generateSpotifyAuthUrl(oauthState);

  const linkSession = await prisma.linkSession.create({
    data: {
      provider,
      oauthState,
      oauthStateExp,
      expiresAt,
      tokenHash,
    },
  });

  switch (client_type) {
    case "AI_AGENT":
      res.status(200).json({
        auth_url: authUrl,
        link_session_token: rawSessionToken,
        session: {
          id: linkSession.id,
          provider: linkSession.provider,
          expiresAt: linkSession.expiresAt,
        },
      });
      return;
    case "WEB":
      res.redirect(authUrl);
      return;
  }
};

export const callback = async (req: Request, res: Response): Promise<void> => {
  const { code, state } = LinkCallbackSchema.parse(req.query);
  const cleanedState = state.replace(/%$/, ""); // temporary guard for % bug

  const linkSession = await prisma.linkSession.findUnique({
    where: {
      oauthState: cleanedState,
    },
    include: {
      linkedAccount: true,
    },
  });

  if (!linkSession) {
    throw new AppError("Link session not found", 404);
  }
  if (linkSession.linkedAccount !== null) {
    // todo what should we do here?
    throw new AppError("Link session already connected", 400);
  }
  if (linkSession.oauthStateExp < new Date()) {
    await prisma.linkSession.update({
      where: { id: linkSession.id },
      data: {
        status: "EXPIRED",
      },
    });
    throw new AppError("OAuth state expired, restart linking", 400);
  }

  // get the user id from the spotify api (TODO or apple music api)
  const callbackResponse = await authenticateSpotify(code);
  const userInfo = await getSpotifyUserInfo(callbackResponse.access_token);
  const accessTokenEnc = encryptToken(callbackResponse.access_token);
  const refreshTokenEnc = encryptToken(callbackResponse.refresh_token);

  // create a linked account
  await prisma.$transaction(async (tx) => {
    const linkedAccount = await tx.linkedAccount.create({
      data: {
        providerUserId: userInfo.id,
        provider: OAuthProvider.SPOTIFY,
        accessToken: accessTokenEnc.ciphertext,
        accessTokenIv: accessTokenEnc.iv,
        accessTokenTag: accessTokenEnc.tag,
        refreshToken: refreshTokenEnc.ciphertext,
        refreshTokenIv: refreshTokenEnc.iv,
        refreshTokenTag: refreshTokenEnc.tag,
        accessTokenExpiresAt: new Date(
          Date.now() + callbackResponse.expires_in * 1000,
        ),
        scopes: callbackResponse.scope,
      },
    });

    await tx.linkSession.update({
      where: { id: linkSession.id },
      data: {
        status: "CONNECTED",
        linkedAccountId: linkedAccount.id,
      },
    });
  });

  res.status(200).json({ success: true });
};
