import axios from "axios";
import { env } from "./env";

export const spotifyApiClient = (accessToken: string) => {
    return axios.create({
        baseURL: env.SPOTIFY_API_URL,
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
};
