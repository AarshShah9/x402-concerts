import axios from "axios";
import { env } from "../env";
import {
  TicketmasterEventQueryParams,
  TicketmasterEventResponseSchema,
} from "./types";
import { AppError } from "../errors";

/**
 * Creates an axios instance for the Ticketmaster API
 * @returns The Ticketmaster API client
 */
const ticketmasterApiClient = axios.create({
  baseURL: env.TICKETMASTER_API_URL,
  params: {
    apikey: env.TICKETMASTER_API_KEY,
  },
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Gets the events from the Ticketmaster API
 * @param config - The configuration for the request
 * @returns The Ticketmaster event response
 */
export const getTicketmasterConcerts = async (
  config: TicketmasterEventQueryParams,
) => {
  try {
    const concerts = await ticketmasterApiClient.get(
      `/discovery/v2/events.json`,
      {
        params: config,
      },
    );
    return TicketmasterEventResponseSchema.parse(concerts.data);
  } catch (error) {
      throw new AppError(
        `Failed to fetch Ticketmaster concerts: ${axios.isAxiosError(error) ? error.message : "Unknown error"}`,
        502,
      );
  }
};
