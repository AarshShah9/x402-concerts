import {
  EventSource,
  FeedIngestor,
  NormalizedAttraction,
  NormalizedEvent,
  NormalizedVenue,
  RawFeedData,
} from "../feed-ingestor/types";
import { getTicketmasterEvents } from ".";

export class TicketmasterIngestor implements FeedIngestor {
  source = EventSource.TICKETMASTER;

  async fetchFeed(
    country: string,
    page: number,
    startDate?: string,
    endDate?: string,
  ): Promise<RawFeedData> {
    // Ticketmaster API limit: (page * size) must be < 1000
    // Using size=100 allows us to fetch up to page 9 (900 < 1000)
    const params: any = {
      countryCode: country,
      page,
      size: 100,
      sort: "date,asc",
      classificationName: ["Music"],
    };

    // Add date filters if provided (for batch processing)
    if (startDate) {
      params.startDateTime = startDate;
    }
    if (endDate) {
      params.endDateTime = endDate;
    }

    const data = await getTicketmasterEvents(params);

    return {
      events: data._embedded?.events || [],
      page: {
        number: data.page.number,
        size: data.page.size,
        totalPages: data.page.totalPages,
        totalElements: data.page.totalElements,
      },
    };
  }

  normalizeEvent(tmEvent: any): NormalizedEvent {
    // Parse dates
    const startDate = tmEvent.dates?.start?.localDate
      ? new Date(tmEvent.dates.start.localDate)
      : undefined;
    const startDateTime = tmEvent.dates?.start?.dateTime
      ? new Date(tmEvent.dates.start.dateTime)
      : undefined;
    const onsaleStartDate = tmEvent.sales?.public?.startDateTime
      ? new Date(tmEvent.sales.public.startDateTime)
      : undefined;
    const onsaleEndDate = tmEvent.sales?.public?.endDateTime
      ? new Date(tmEvent.sales.public.endDateTime)
      : undefined;

    // Parse pricing
    const priceRanges = tmEvent.priceRanges || [];
    const minPrice = priceRanges.length > 0 ? priceRanges[0].min : undefined;
    const maxPrice = priceRanges.length > 0 ? priceRanges[0].max : undefined;
    const currency =
      priceRanges.length > 0 ? priceRanges[0].currency : undefined;

    // Parse classification
    const primaryClassification =
      tmEvent.classifications?.find((c: any) => c.primary === true) ||
      tmEvent.classifications?.[0];
    const genreName = primaryClassification?.genre?.name;
    const segmentName = primaryClassification?.segment?.name;

    // Get venue
    const tmVenue = tmEvent._embedded?.venues?.[0];
    if (!tmVenue) {
      throw new Error(`Event ${tmEvent.id} has no venue`);
    }

    // Get attractions
    const tmAttractions = tmEvent._embedded?.attractions || [];

    return {
      source: EventSource.TICKETMASTER,
      sourceId: tmEvent.id,
      name: tmEvent.name,
      dateTBD: tmEvent.dates?.start?.dateTBD || false,
      dateTBA: tmEvent.dates?.start?.dateTBA || false,
      isTest: tmEvent.test || false,
      venue: this.normalizeVenue(tmVenue),
      attractions: tmAttractions.map((a: any) => this.normalizeAttraction(a)),
      ...(tmEvent.url && { url: tmEvent.url }),
      ...(tmEvent.images?.[0]?.url && { imageUrl: tmEvent.images[0].url }),
      ...(startDate && { startDate }),
      ...(startDateTime && { startDateTime }),
      ...(tmEvent.dates?.timezone && { timezone: tmEvent.dates.timezone }),
      ...(onsaleStartDate && { onsaleStartDate }),
      ...(onsaleEndDate && { onsaleEndDate }),
      ...(minPrice !== undefined && { minPrice }),
      ...(maxPrice !== undefined && { maxPrice }),
      ...(currency && { currency }),
      ...(genreName && { genreName }),
      ...(segmentName && { segmentName }),
    };
  }

  normalizeAttraction(tmAttraction: any): NormalizedAttraction {
    return {
      source: EventSource.TICKETMASTER,
      sourceId: tmAttraction.id,
      name: tmAttraction.name,
      aliases: tmAttraction.aliases || [],
      ...(tmAttraction.images?.[0]?.url && { imageUrl: tmAttraction.images[0].url }),
      ...(tmAttraction.externalLinks && { externalLinks: tmAttraction.externalLinks }),
    };
  }

  normalizeVenue(tmVenue: any): NormalizedVenue {
    const latitude = tmVenue.location?.latitude
      ? parseFloat(tmVenue.location.latitude)
      : undefined;
    const longitude = tmVenue.location?.longitude
      ? parseFloat(tmVenue.location.longitude)
      : undefined;

    return {
      source: EventSource.TICKETMASTER,
      sourceId: tmVenue.id,
      name: tmVenue.name,
      country: tmVenue.country?.countryCode || "US",
      ...(tmVenue.city?.name && { city: tmVenue.city.name }),
      ...(tmVenue.state?.stateCode && { state: tmVenue.state.stateCode }),
      ...(tmVenue.postalCode && { postalCode: tmVenue.postalCode }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(tmVenue.address?.line1 && { address: tmVenue.address.line1 }),
    };
  }
}
