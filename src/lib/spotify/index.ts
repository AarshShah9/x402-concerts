import axios from "axios";
import { env } from "../env";
import {
  SpotifyTokenResponseSchema,
  SpotifyFollowingResponseSchema,
  SpotifyUserSchema,
  SpotifyTopArtistParams,
  SpotifyTopArtistsTrackResponseSchema,
} from "./types";
import { AppError } from "../errors";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-recently-played",
  "user-top-read",
  "user-follow-read",
];

/**
 * Creates an axios instance for the Spotify API
 * @param accessToken - The access token to use for the API calls
 * @returns
 */
const spotifyApiClient = (accessToken: string) => {
  return axios.create({
    baseURL: env.SPOTIFY_API_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

/**
 * Generates the Spotify authorization URL for the given oauth state
 * @param oauthState - The oauth state to use for the authorization URL
 * @returns The Spotify authorization URL
 */
export const generateSpotifyAuthUrl = (oauthState: string) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES.join(" "),
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    state: oauthState,
  });

  return `${env.SPOTIFY_AUTHORIZATION_URL}/authorize?${params.toString()}`;
};

/**
 * Authenticates with the Spotify API using the given code
 * @param code - The code to use for authentication
 * @returns The Spotify callback response
 */
export const authenticateSpotify = async (code: string) => {
  try {
    const authOptions = {
      url: `${env.SPOTIFY_AUTHORIZATION_URL}/api/token`,
      form: {
        code: code,
        redirect_uri: env.SPOTIFY_REDIRECT_URI,
        grant_type: "authorization_code",
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET,
          ).toString("base64"),
      },
      json: true,
    };

    const response = await axios.post(authOptions.url, authOptions.form, {
      headers: authOptions.headers,
    });
    return SpotifyTokenResponseSchema.parse(response.data);
  } catch (error) {
    throw new AppError(
      `Spotify authentication failed: ${axios.isAxiosError(error) ? error.message : "Unknown error"}`,
      502,
    );
  }
};

/**
 * Gets the following artists from the Spotify API
 * @param accessToken - The access token to use for the API calls
 * @param limit - The limit of artists to get
 * @returns The Spotify following response
 */
export const getSpotifyFollowing = async (
  accessToken: string,
  limit: number,
) => {
  try {
    const followed = await spotifyApiClient(accessToken).get(
      `me/following?type=artist&limit=${limit}`,
    );
    return SpotifyFollowingResponseSchema.parse(followed.data);
  } catch (error) {
    throw new AppError(
      `Failed to fetch Spotify following: ${axios.isAxiosError(error) ? error.message : "Unknown error"}`,
      502,
    );
  }
};

/**
 * Gets the user info from the Spotify API
 * @param accessToken - The access token to use for the API calls
 * @returns The Spotify user info
 */
export const getSpotifyUserInfo = async (accessToken: string) => {
  try {
    const userInfo = await spotifyApiClient(accessToken).get(`/me`);
    return SpotifyUserSchema.parse(userInfo.data);
  } catch (error) {
    throw new AppError(
      `Failed to fetch Spotify user info: ${axios.isAxiosError(error) ? error.message : "Unknown error"}`,
      502,
    );
  }
};

/**
 * Refreshes the Spotify access token
 * @param refreshToken - The refresh token to use for the refresh
 * @returns The Spotify token response
 */
export const refreshSpotifyAccessToken = async (refreshToken: string) => {
  try {
    const tokenResponse = await axios.post(
      `${env.SPOTIFY_AUTHORIZATION_URL}/api/token`,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET,
            ).toString("base64"),
        },
      },
    );
    return SpotifyTokenResponseSchema.parse(tokenResponse.data);
  } catch (error) {
    throw new AppError(
      `Failed to refresh Spotify access token: ${axios.isAxiosError(error) ? error.message : "Unknown error"}`,
      502,
    );
  }
};


export const getSpotifyTopArtists = async (accessToken: string, params: SpotifyTopArtistParams) => {
  try {
    const artists = await spotifyApiClient(accessToken).get(`me/top/artists`, { params });
    return SpotifyTopArtistsTrackResponseSchema.parse(artists.data);
  } catch (error) {
    throw new AppError(
      `Failed to fetch Spotify top artists: ${(error as any)?.message}`,
      502,
    );
  }
};

