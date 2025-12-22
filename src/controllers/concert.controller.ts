import { Request, Response } from "express";
import { ConcertsQuerySchema } from "../lib/types";
import prisma from "../lib/prisma";
import { decryptToken, encryptToken, hash } from "../lib/crypto";
import axios from "axios";
import { env } from "../lib/env";
import { getSpotifyFollowing } from "../lib/spotify";
import { getTicketmasterConcerts } from "../lib/ticketmaster";

export const getConcerts = async (req: Request, res: Response): Promise<void> => {
    try {
        const { link_session_token, lat, lng, radius_km, start_date, end_date, limit, refresh } = ConcertsQuerySchema.parse(req.query);

        const session = await prisma.linkSession.findUniqueOrThrow({
            where: {
                tokenHash: hash(link_session_token),
            },
            include: {
                linkedAccount: true,
            },
        });

        if (session.status !== "CONNECTED") {
            res.status(400).json({ error: "Link session not connected" });
            return;
        }

        if (session.expiresAt < new Date()) {
            res.status(400).json({ error: "Link session expired" });
            return;
        }

        if (session.linkedAccount === null) {
            res.status(400).json({ error: "Linked account not found" });
            return;
        }

        // Check if access token is expired and refresh if needed
        let accessToken = decryptToken({ 
            ciphertext: session.linkedAccount.accessToken, 
            iv: session.linkedAccount.accessTokenIv, 
            tag: session.linkedAccount.accessTokenTag 
        });

        if (session.linkedAccount.accessTokenExpiresAt < new Date()) {
            // Token is expired, refresh it
            const refreshToken = decryptToken({
                ciphertext: session.linkedAccount.refreshToken,
                iv: session.linkedAccount.refreshTokenIv,
                tag: session.linkedAccount.refreshTokenTag
            });

            const tokenResponse = await axios.post(
                `${env.SPOTIFY_AUTHORIZATION_URL}/api/token`,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                }),
                {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + Buffer.from(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET).toString('base64')
                    }
                }
            );

            const { access_token, expires_in } = tokenResponse.data;
            accessToken = access_token;

            // Encrypt and save new access token
            const accessTokenEnc = encryptToken(access_token);
            await prisma.linkedAccount.update({
                where: { id: session.linkedAccount.id },
                data: {
                    accessToken: accessTokenEnc.ciphertext,
                    accessTokenIv: accessTokenEnc.iv,
                    accessTokenTag: accessTokenEnc.tag,
                    accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
                }
            });
        }

        // TODO combine data from top artists and followed artists
        // const artists = await spotifyApiClient(accessToken).get(`me/top/artists?limit=${limit}&time_range=long_term`);
        const followed = await getSpotifyFollowing(accessToken, limit);
        const artists = [...followed.artists.items];
        const concerts = await getTicketmasterConcerts({ keyword: artists[3]?.name! });
        res.status(200).json({ data: concerts });
        return;

    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
};