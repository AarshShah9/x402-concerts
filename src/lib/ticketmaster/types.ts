import z from "zod";

export type TicketmasterEventQueryParams = {
    /**
     * Filter entities by its id
     */
    id?: string;
  
    /**
     * Keyword to search on
     */
    keyword?: string;
  
    /**
     * Filter by attraction id
     */
    attractionId?: string;
  
    /**
     * Filter by venue id
     */
    venueId?: string;
  
    /**
     * Filter by postal code / zipcode
     */
    postalCode?: string;
  
    /**
     * Filter events by latitude and longitude.
     * @deprecated This filter is deprecated and may be removed in a future release. Please use geoPoint instead.
     */
    latlong?: string;
  
    /**
     * Radius of the area in which we want to search for events.
     */
    radius?: string;
  
    /**
     * Unit of the radius
     * @default "miles"
     */
    unit?: 'miles' | 'km';
  
    /**
     * Filter entities by its primary source name OR publishing source name
     */
    source?: 'ticketmaster' | 'universe' | 'frontgate' | 'tmr';
  
    /**
     * The locale in ISO code format. Multiple comma-separated values can be provided.
     * When omitting the country part of the code (e.g. only 'en' or 'fr') then the first matching locale is used.
     * When using a '*' it matches all locales. '*' can only be used at the end (e.g. 'en-us,en,*')
     * @default "en"
     */
    locale?: string;
  
    /**
     * Filter by market id
     */
    marketId?: string;
  
    /**
     * Filter with a start date after this date
     */
    startDateTime?: string;
  
    /**
     * Filter with a start date before this date
     */
    endDateTime?: string;
  
    /**
     * Yes, to include with date to be announce (TBA)
     * @default "no" (if date parameter sent, yes otherwise)
     */
    includeTBA?: 'yes' | 'no' | 'only';
  
    /**
     * Yes, to include with a date to be defined (TBD)
     * @default "no" (if date parameter sent, yes otherwise)
     */
    includeTBD?: 'yes' | 'no' | 'only';
  
    /**
     * Yes if you want to have entities flag as test in the response. Only, if you only wanted test entities
     * @default "no"
     */
    includeTest?: 'yes' | 'no' | 'only';
  
    /**
     * Page size of the response
     * @default "20"
     */
    size?: string | number;
  
    /**
     * Page number
     * @default "0"
     */
    page?: string | number;
  
    /**
     * Sorting order of the search result.
     * @default "relevance,desc"
     */
    sort?:
      | 'name,asc'
      | 'name,desc'
      | 'date,asc'
      | 'date,desc'
      | 'relevance,asc'
      | 'relevance,desc'
      | 'distance,asc'
      | 'name,date,asc'
      | 'name,date,desc'
      | 'date,name,asc'
      | 'date,name,desc'
      | 'distance,date,asc'
      | 'onSaleStartDate,asc'
      | 'id,asc'
      | 'venueName,asc'
      | 'venueName,desc'
      | 'random';
  
    /**
     * Filter with onsale start date after this date
     */
    onsaleStartDateTime?: string;
  
    /**
     * Filter with onsale end date before this date
     */
    onsaleEndDateTime?: string;
  
    /**
     * Filter by city
     */
    city?: string[];
  
    /**
     * Filter by country code
     */
    countryCode?: string;
  
    /**
     * Filter by state code
     */
    stateCode?: string;
  
    /**
     * Filter by classification name: name of any segment, genre, sub-genre, type, sub-type.
     * Negative filtering is supported by using the following format '-'.
     * Be aware that negative filters may cause decreased performance.
     */
    classificationName?: string[];
  
    /**
     * Filter by classification id: id of any segment, genre, sub-genre, type, sub-type.
     * Negative filtering is supported by using the following format '-'.
     * Be aware that negative filters may cause decreased performance.
     */
    classificationId?: string[];
  
    /**
     * Filter by dma id
     */
    dmaId?: string;
  
    /**
     * Filter with event local start date time within this range
     */
    localStartDateTime?: string[];
  
    /**
     * Filter event where event local start and end date overlap this range
     */
    localStartEndDateTime?: string[];
  
    /**
     * Filter event where event start and end date overlap this range
     */
    startEndDateTime?: string[];
  
    /**
     * Filter with events with public visibility starting
     */
    publicVisibilityStartDateTime?: string[];
  
    /**
     * Filter events with a presaleFilterTransformer start and end that intersects with this range
     */
    preSaleDateTime?: string[];
  
    /**
     * Filter with onsale start date on this date
     */
    onsaleOnStartDate?: string;
  
    /**
     * Filter with onsale range within this date
     */
    onsaleOnAfterStartDate?: string;
  
    /**
     * Filter by collection id
     */
    collectionId?: string[];
  
    /**
     * Filter by segment id
     */
    segmentId?: string[];
  
    /**
     * Filter by segment name
     */
    segmentName?: string[];
  
    /**
     * Filter by classification that are family-friendly
     * @default "yes"
     */
    includeFamily?: 'yes' | 'no' | 'only';
  
    /**
     * Filter by promoter id
     */
    promoterId?: string;
  
    /**
     * Filter by genreId
     */
    genreId?: string[];
  
    /**
     * Filter by subGenreId
     */
    subGenreId?: string[];
  
    /**
     * Filter by typeId
     */
    typeId?: string[];
  
    /**
     * Filter by subTypeId
     */
    subTypeId?: string[];
  
    /**
     * Filter events by geoHash
     */
    geoPoint?: string;
  
    /**
     * Popularity boost by country
     * @default "us"
     */
    preferredCountry?: 'us' | 'ca';
  
    /**
     * Yes, to include spell check suggestions in the response.
     * @default "no"
     */
    includeSpellcheck?: 'yes' | 'no';
  
    /**
     * Filter entities based on domains they are available on
     */
    domain?: string[];
  };

const LinkSchema = z.object({
  href: z.string(),
  templated: z.boolean().optional(),
});

const LinksMapSchema = z.object({
  self: LinkSchema.optional(),
  next: LinkSchema.optional(),
  prev: LinkSchema.optional(),
  attractions: z.union([LinkSchema, z.array(LinkSchema)]).optional(),
  venues: z.union([LinkSchema, z.array(LinkSchema)]).optional(),
});

const ImageSchema = z.looseObject({
  url: z.string(),
  ratio: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fallback: z.boolean().optional(),
});

const DateObjSchema = z.looseObject({
  localDate: z.string().optional(),
  localTime: z.string().optional(),
  dateTime: z.string().optional(),
  dateTBD: z.boolean().optional(),
  dateTBA: z.boolean().optional(),
  timeTBA: z.boolean().optional(),
  noSpecificTime: z.boolean().optional(),
});

const DatesSchema = z.object({
  start: DateObjSchema.optional(),
  end: DateObjSchema.optional(),
  access: DateObjSchema.optional(),
  timezone: z.string().optional(),
  status: z.looseObject({
    code: z.string().optional(),
  }).optional(),
  spanMultipleDays: z.boolean().optional(),
});

const SalesSchema = z.object({
  public: z.looseObject({
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
    startTBD: z.boolean().optional(),
    startTBA: z.boolean().optional(),
  }).optional(),
  presales: z.array(z.looseObject({
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
    name: z.string().optional(),
  })).optional(),
});

const PriceRangeSchema = z.looseObject({
  type: z.string().optional(),
  currency: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const PromoterSchema = z.looseObject({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const ClassificationSchema = z.looseObject({
  primary: z.boolean().optional(),
  segment: z.object({ id: z.string(), name: z.string() }).optional(),
  genre: z.object({ id: z.string(), name: z.string() }).optional(),
  subGenre: z.object({ id: z.string(), name: z.string() }).optional(),
  type: z.object({ id: z.string(), name: z.string() }).optional(),
  subType: z.object({ id: z.string(), name: z.string() }).optional(),
  family: z.boolean().optional(),
});

const LocationSchema = z.looseObject({
  longitude: z.string().or(z.number()).optional(),
  latitude: z.string().or(z.number()).optional(),
});

const PlaceSchema = z.looseObject({
  area: z.looseObject({ name: z.string().optional() }).optional(),
  address: z.looseObject({ line1: z.string().optional() }).optional(),
  city: z.looseObject({ name: z.string().optional() }).optional(),
  state: z.looseObject({ name: z.string().optional(), stateCode: z.string().optional() }).optional(),
  country: z.looseObject({ name: z.string().optional(), countryCode: z.string().optional() }).optional(),
  postalCode: z.string().optional(),
  location: LocationSchema.optional(),
  name: z.string().optional(),
});

const EventSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  test: z.boolean().optional(),
  url: z.string().optional(),
  locale: z.string().optional(),
  images: z.array(ImageSchema).optional(),
  sales: SalesSchema.optional(),
  dates: DatesSchema.optional(),
  classifications: z.array(ClassificationSchema).optional(),
  promoter: PromoterSchema.optional(),
  promoters: z.array(PromoterSchema).optional(),
  info: z.string().optional(),
  pleaseNote: z.string().optional(),
  priceRanges: z.array(PriceRangeSchema).optional(),
  seatmap: z.looseObject({ staticUrl: z.string().optional() }).optional(),
  accessibility: z.looseObject({ info: z.string().optional() }).optional(),
  ticketLimit: z.object({
    info: z.string().optional(),
    infos: z.record(z.string(), z.string()).optional(),
  }).optional(),
  
  // External links & Aliases
  // externalLinks: z.record(z.array(z.looseObject({ url: z.string() })).optional()).optional(),
  aliases: z.array(z.string()).optional(),
  localizedAliases: z.record(z.string(), z.string()).optional(),

  // Location/Distance specific fields (as requested)
  distance: z.number().optional(),
  units: z.string().optional(),
  location: LocationSchema.optional(),
  place: PlaceSchema.optional(),

  // Containers
  _links: LinksMapSchema.optional(),
  _embedded: z.looseObject({
    venues: z.array(z.any()).optional(),
    attractions: z.array(z.any()).optional(),
  }).optional(),
  
  // Products/Outlets
  productType: z.string().optional(),
  products: z.array(z.any()).optional(),
  outlets: z.array(z.any()).optional(),
});

export const TicketmasterEventResponseSchema = z.object({
  _links: LinksMapSchema,
  page: z.object({
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
    number: z.number(),
  }),
  _embedded: z.object({
    events: z.array(EventSchema),
  }).optional(),
});
