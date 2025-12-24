export enum EventSource {
  TICKETMASTER = "TICKETMASTER",
}

export interface NormalizedAttraction {
  source: EventSource;
  sourceId: string;
  name: string;
  aliases: string[];
  imageUrl?: string;
  externalLinks?: Record<string, any>;
}

export interface NormalizedVenue {
  source: EventSource;
  sourceId: string;
  name: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface NormalizedEvent {
  source: EventSource;
  sourceId: string;
  name: string;
  url?: string;
  imageUrl?: string;
  startDate?: Date;
  startDateTime?: Date;
  timezone?: string;
  dateTBD: boolean;
  dateTBA: boolean;
  onsaleStartDate?: Date;
  onsaleEndDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  genreName?: string;
  segmentName?: string;
  isTest: boolean;
  venue: NormalizedVenue;
  attractions: NormalizedAttraction[];
}

export interface RawFeedData {
  events: any[];
  page: {
    number: number;
    size: number;
    totalPages: number;
    totalElements: number;
  };
}

export interface FeedIngestor {
  source: EventSource;
  fetchFeed(
    country: string,
    page: number,
    startDate?: string,
    endDate?: string,
  ): Promise<RawFeedData>;
  normalizeEvent(raw: any): NormalizedEvent;
  normalizeAttraction(raw: any): NormalizedAttraction;
  normalizeVenue(raw: any): NormalizedVenue;
}
