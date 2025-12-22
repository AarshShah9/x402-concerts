import axios from "axios";
import { env } from "../env";
import { TicketmasterEventQueryParams, TicketmasterEventResponseSchema } from "./types";

const ticketmasterApiClient = axios.create({
    baseURL: env.TICKETMASTER_API_URL,
    params: {
        apikey: env.TICKETMASTER_API_KEY,
    },
    headers: {
        "Content-Type": "application/json",
    },
});

export const getTicketmasterConcerts = async (config: TicketmasterEventQueryParams) => {
    const concerts = await ticketmasterApiClient.get(`/discovery/v2/events.json`, {
        params: config
    });
    return TicketmasterEventResponseSchema.parse(concerts.data);
}