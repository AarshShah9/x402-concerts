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

// Helper function to generate session token and expiry
const generateSessionToken = () => {
  const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 minutes
  const rawSessionToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hash(rawSessionToken);
  return { expiresAt, rawSessionToken, tokenHash };
};

export const init = async (req: Request, res: Response): Promise<void> => {
  // validate request body
  const { provider, client_type, link_session_token } = LinkInitSchema.parse(
    req.body,
  );

  // todo remove once we support more providers + get seperate service layers for different providers
  if (provider !== "SPOTIFY") {
    throw new AppError("Only SPOTIFY is supported for now", 400);
  }

  // Token refresh scenario: AI agent providing existing token
  if (link_session_token) {
    const existingSession = await prisma.linkSession.findUnique({
      where: {
        tokenHash: hash(link_session_token),
      },
      include: {
        linkedAccount: true,
      },
    });

    if (!existingSession) {
      throw new AppError(
        "Invalid link session token. Please re-authenticate.",
        401,
      );
    }

    if (existingSession.status !== "CONNECTED") {
      throw new AppError(
        "Link session is not connected. Please complete authentication first.",
        400,
      );
    }

    if (existingSession.expiresAt < new Date()) {
      throw new AppError(
        "Link session has expired. Please re-authenticate.",
        401,
      );
    }

    if (!existingSession.linkedAccount) {
      throw new AppError(
        "No linked account found. Please complete authentication first.",
        400,
      );
    }

    // Create new session for the same linked account
    const { expiresAt, rawSessionToken, tokenHash } = generateSessionToken();

    const newLinkSession = await prisma.linkSession.create({
      data: {
        provider,
        oauthState: crypto.randomUUID(), // placeholder, not used for refresh
        oauthStateExp: new Date(Date.now() + 5 * 60 * 1000), // placeholder
        expiresAt,
        tokenHash,
        status: "CONNECTED",
        linkedAccountId: existingSession.linkedAccount.id,
      },
    });

    res.status(200).json({
      link_session_token: rawSessionToken,
      session: {
        id: newLinkSession.id,
        provider: newLinkSession.provider,
        expiresAt: newLinkSession.expiresAt,
      },
    });
    return;
  }

  // Standard OAuth flow
  const { expiresAt, rawSessionToken, tokenHash } = generateSessionToken();
  const oauthState = crypto.randomUUID();
  const oauthStateExp = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
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
  // Prevent processing the same linkSession twice (security)
  // Note: Re-authentication creates a NEW linkSession, so this check passes
  if (linkSession.linkedAccount !== null) {
    throw new AppError("Link session already connected", 400);
  }
  if (linkSession.oauthStateExp < new Date()) {
    throw new AppError("OAuth state expired, restart linking", 400);
  }

  // get the user id from the spotify api (TODO or apple music api)
  const callbackResponse = await authenticateSpotify(code);
  const userInfo = await getSpotifyUserInfo(callbackResponse.access_token);
  const accessTokenEnc = encryptToken(callbackResponse.access_token);
  const refreshTokenEnc = encryptToken(callbackResponse.refresh_token);

  // upsert linked account (create new or update existing on re-authentication)
  await prisma.$transaction(async (tx) => {
    const linkedAccount = await tx.linkedAccount.upsert({
      where: {
        providerUserId: userInfo.id,
      },
      create: {
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
      update: {
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
