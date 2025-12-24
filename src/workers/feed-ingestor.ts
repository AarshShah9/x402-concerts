import { FeedIngestor, EventSource, NormalizedEvent } from "../lib/feed-ingestor/types";
import { TicketmasterIngestor } from "../lib/ticketmaster/discovery-feed";
import prisma from "../lib/prisma";
import { env } from "../lib/env";

const ingestors: FeedIngestor[] = [new TicketmasterIngestor()];

/**
 * Generates monthly date ranges for batch processing
 * Returns ranges from FEED_EVENT_RETENTION_DAYS_PAST ago to FEED_EVENT_RETENTION_MONTHS_FUTURE ahead
 */
function generateDateRanges(): Array<{ startDate: string; endDate: string }> {
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  
  const pastDays = env.FEED_EVENT_RETENTION_DAYS_PAST || 90;
  const futureMonths = env.FEED_EVENT_RETENTION_MONTHS_FUTURE || 18;
  
  // Start date: X days in the past
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - pastDays);
  
  // End date: Y months in the future
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + futureMonths);
  
  // Generate monthly ranges
  let currentStart = new Date(startDate);
  
  while (currentStart < endDate) {
    // Calculate end of current month batch
    const currentEnd = new Date(currentStart);
    currentEnd.setMonth(currentEnd.getMonth() + 1);
    
    // Don't exceed the final end date
    const batchEnd = currentEnd > endDate ? endDate : currentEnd;
    
    ranges.push({
      startDate: currentStart.toISOString().split('T')[0] + 'T00:00:00Z',
      endDate: batchEnd.toISOString().split('T')[0] + 'T23:59:59Z',
    });
    
    // Move to next month
    currentStart = new Date(batchEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  
  return ranges;
}

export async function syncFeeds() {
  const countries = env.FEED_SYNC_COUNTRIES.split(",").map((c) => c.trim());

  console.log(`[Feed Sync] Starting sync for ${countries.length} countries`);

  for (const ingestor of ingestors) {
    for (const country of countries) {
      try {
        await syncFeedForSource(ingestor, country);
      } catch (error) {
        console.error(
          `[Feed Sync] Error syncing ${ingestor.source} for ${country}:`,
          error,
        );
      }
    }
  }

  console.log("[Feed Sync] Sync complete");
}

/**
 * Syncs feed data from a specific source for a specific country
 * 
 * DATE-BASED BATCHING STRATEGY:
 * - Splits sync into monthly batches to bypass Ticketmaster's 1000-event limit
 * - Each batch can return up to 1000 events (10 pages × 100 size)
 * - Allows ingestion of millions of events across all date ranges
 * 
 * FAULT TOLERANCE:
 * - Retries failed pages up to 3 times with exponential backoff
 * - If a page fails after all retries, it skips that page and continues
 * - Does NOT stop the entire country sync due to one page failure
 * 
 * TICKETMASTER PAGINATION LIMITS:
 * - API enforces: (page * size) < 1000
 * - Using size=100 allows pages 0-9 (1000 events total per batch)
 * - Automatically stops at page 10 to respect this limit
 */
async function syncFeedForSource(ingestor: FeedIngestor, country: string) {
  const startTime = Date.now();
  console.log(`[Feed Sync] Syncing ${ingestor.source} for ${country}...`);

  // Update sync status to running
  await prisma.feedSyncStatus.upsert({
    where: {
      source_country: {
        source: ingestor.source,
        country,
      },
    },
    create: {
      source: ingestor.source,
      country,
      lastSyncAt: new Date(),
      status: "running",
      eventsIngested: 0,
    },
    update: {
      lastSyncAt: new Date(),
      status: "running",
      errorMessage: null,
    },
  });

  try {
    let totalEvents = 0;
    let totalSkipped = 0;

    // Generate monthly date ranges for batching
    // Fetch from 90 days ago to 18 months in the future
    const dateRanges = generateDateRanges();
    
    console.log(
      `[Feed Sync] Processing ${dateRanges.length} date batches for ${ingestor.source} ${country}`,
    );

    // Process each date range as a separate batch
    for (let batchIndex = 0; batchIndex < dateRanges.length; batchIndex++) {
      const range = dateRanges[batchIndex];
      if (!range) continue;
      
      const { startDate, endDate } = range;
      
      console.log(
        `[Feed Sync] Batch ${batchIndex + 1}/${dateRanges.length}: ${startDate} to ${endDate}`,
      );

      let page = 0;
      let hasMore = true;
      let batchEvents = 0;

      while (hasMore) {
        // Retry logic with exponential backoff
        let retryCount = 0;
        let feedData;
        const maxRetries = 3;
        let pageFailed = false;

        while (retryCount <= maxRetries) {
          try {
            feedData = await ingestor.fetchFeed(country, page, startDate, endDate);
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              console.error(
                `[Feed Sync] Failed to fetch page ${page + 1} after ${maxRetries} retries for ${ingestor.source} ${country} (batch ${batchIndex + 1}). Skipping page and continuing...`,
              );
              pageFailed = true;
              break; // Skip this page and continue
            }

            // Exponential backoff: 2s, 4s, 8s
            const backoffMs = Math.pow(2, retryCount) * 1000;
            console.warn(
              `[Feed Sync] Retry ${retryCount}/${maxRetries} for page ${page + 1} after ${backoffMs}ms (${ingestor.source} ${country} batch ${batchIndex + 1})`,
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }

        // If page failed after all retries, skip and continue
        if (pageFailed) {
          page++;
          // Check if we've hit the hard limit for pagination
          // For Ticketmaster: (page * size) < 1000, with size=100, max page is 9
          if (page >= 10) {
            console.warn(
              `[Feed Sync] Reached Ticketmaster pagination limit for ${ingestor.source} ${country} batch ${batchIndex + 1}. Moving to next batch.`,
            );
            hasMore = false;
          }
          continue; // Skip to next page
        }

        if (!feedData || feedData.events.length === 0) {
          hasMore = false;
          break;
        }

        // Process events in batches
        for (const rawEvent of feedData.events) {
          try {
            const normalizedEvent = ingestor.normalizeEvent(rawEvent);
            await upsertEvent(normalizedEvent);
            totalEvents++;
            batchEvents++;
          } catch (error) {
            totalSkipped++;
            // Continue with next event silently (most skips are expected)
          }
        }

        console.log(
          `[Feed Sync] Batch ${batchIndex + 1}/${dateRanges.length} - Page ${page + 1}/${feedData.page.totalPages} (${batchEvents} events)`,
        );

        page++;
        hasMore = page < feedData.page.totalPages;

        // Ticketmaster API limit: (page * size) < 1000
        // With size=100, max page index is 9 (page 10 would be 10*100=1000)
        if (page >= 10) {
          console.warn(
            `[Feed Sync] Reached Ticketmaster pagination limit (page 10) for ${ingestor.source} ${country} batch ${batchIndex + 1}. Total pages available: ${feedData.page.totalPages}`,
          );
          hasMore = false;
        }

        // Add delay between pages to avoid rate limiting
        // Increased to 1.5 seconds for better rate limit compliance
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      console.log(
        `[Feed Sync] Batch ${batchIndex + 1}/${dateRanges.length} complete: ${batchEvents} events saved`,
      );
    }

    // Prune old events for this source
    await pruneOldEvents(ingestor.source);

    // Update sync status to success
    await prisma.feedSyncStatus.update({
      where: {
        source_country: {
          source: ingestor.source,
          country,
        },
      },
      data: {
        status: "success",
        lastSuccessAt: new Date(),
        eventsIngested: totalEvents,
        errorMessage: null,
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(
      `[Feed Sync] ${ingestor.source} ${country}: ${totalEvents} events (${totalSkipped} skipped) in ${duration}s`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await prisma.feedSyncStatus.update({
      where: {
        source_country: {
          source: ingestor.source,
          country,
        },
      },
      data: {
        status: "error",
        errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Upserts an event with its venue and attractions
 * 
 * DUPLICATE PREVENTION:
 * - Uses Prisma's upsert with @@unique([source, sourceId]) constraint
 * - If a record with same source+sourceId exists, it will be UPDATED
 * - If it doesn't exist, it will be CREATED
 * - This prevents duplicates from the same source automatically
 */
async function upsertEvent(event: NormalizedEvent) {
  // Upsert venue
  const venue = await prisma.venue.upsert({
    where: {
      source_sourceId: {
        source: event.venue.source,
        sourceId: event.venue.sourceId,
      },
    },
    create: {
      source: event.venue.source,
      sourceId: event.venue.sourceId,
      name: event.venue.name,
      city: event.venue.city ?? null,
      state: event.venue.state ?? null,
      country: event.venue.country,
      postalCode: event.venue.postalCode ?? null,
      latitude: event.venue.latitude ?? null,
      longitude: event.venue.longitude ?? null,
      address: event.venue.address ?? null,
    },
    update: {
      name: event.venue.name,
      city: event.venue.city ?? null,
      state: event.venue.state ?? null,
      country: event.venue.country,
      postalCode: event.venue.postalCode ?? null,
      latitude: event.venue.latitude ?? null,
      longitude: event.venue.longitude ?? null,
      address: event.venue.address ?? null,
    },
  });

  // Upsert attractions
  const attractionIds: string[] = [];
  let skippedAttractions = 0;
  for (const attraction of event.attractions) {
    // Skip attractions without names
    if (!attraction.name) {
      skippedAttractions++;
      continue;
    }

    const upsertedAttraction = await prisma.attraction.upsert({
      where: {
        source_sourceId: {
          source: attraction.source,
          sourceId: attraction.sourceId,
        },
      },
      create: {
        source: attraction.source,
        sourceId: attraction.sourceId,
        name: attraction.name,
        aliases: attraction.aliases,
        imageUrl: attraction.imageUrl ?? null,
        externalLinks: attraction.externalLinks || {},
      },
      update: {
        name: attraction.name,
        aliases: attraction.aliases,
        imageUrl: attraction.imageUrl ?? null,
        externalLinks: attraction.externalLinks || {},
      },
    });
    attractionIds.push(upsertedAttraction.id);
  }

  // Events without attractions are valid (festivals, venue announcements, etc.)

  // Upsert event
  const upsertedEvent = await prisma.event.upsert({
    where: {
      source_sourceId: {
        source: event.source,
        sourceId: event.sourceId,
      },
    },
    create: {
      source: event.source,
      sourceId: event.sourceId,
      name: event.name,
      url: event.url ?? null,
      imageUrl: event.imageUrl ?? null,
      startDate: event.startDate ?? null,
      startDateTime: event.startDateTime ?? null,
      timezone: event.timezone ?? null,
      dateTBD: event.dateTBD,
      dateTBA: event.dateTBA,
      onsaleStartDate: event.onsaleStartDate ?? null,
      onsaleEndDate: event.onsaleEndDate ?? null,
      minPrice: event.minPrice ?? null,
      maxPrice: event.maxPrice ?? null,
      currency: event.currency ?? null,
      genreName: event.genreName ?? null,
      segmentName: event.segmentName ?? null,
      isTest: event.isTest,
      venueId: venue.id,
    },
    update: {
      name: event.name,
      url: event.url ?? null,
      imageUrl: event.imageUrl ?? null,
      startDate: event.startDate ?? null,
      startDateTime: event.startDateTime ?? null,
      timezone: event.timezone ?? null,
      dateTBD: event.dateTBD,
      dateTBA: event.dateTBA,
      onsaleStartDate: event.onsaleStartDate ?? null,
      onsaleEndDate: event.onsaleEndDate ?? null,
      minPrice: event.minPrice ?? null,
      maxPrice: event.maxPrice ?? null,
      currency: event.currency ?? null,
      genreName: event.genreName ?? null,
      segmentName: event.segmentName ?? null,
      isTest: event.isTest,
      venueId: venue.id,
    },
  });

  // Delete existing event-attraction relationships
  await prisma.eventAttraction.deleteMany({
    where: { eventId: upsertedEvent.id },
  });

  // Create new event-attraction relationships
  for (const attractionId of attractionIds) {
    await prisma.eventAttraction.create({
      data: {
        eventId: upsertedEvent.id,
        attractionId,
      },
    });
  }
}

async function pruneOldEvents(source: EventSource) {
  const pastCutoff = new Date();
  pastCutoff.setDate(
    pastCutoff.getDate() - (env.FEED_EVENT_RETENTION_DAYS_PAST || 90),
  );

  const futureCutoff = new Date();
  futureCutoff.setMonth(
    futureCutoff.getMonth() + (env.FEED_EVENT_RETENTION_MONTHS_FUTURE || 18),
  );

  const result = await prisma.event.deleteMany({
    where: {
      source,
      OR: [
        { startDate: { lt: pastCutoff } },
        { startDate: { gt: futureCutoff } },
      ],
    },
  });

  if (result.count > 0) {
    console.log(`[Feed Sync] Pruned ${result.count} old events for ${source}`);
  }
}

// Schedule function (can be called from index.ts)
export function startFeedSyncScheduler() {
  const schedule = env.FEED_SYNC_SCHEDULE || "0 */6 * * *"; // Default: every 6 hours

  console.log(`[Feed Sync] Scheduler initialized with schedule: ${schedule}`);

  // Parse cron-like schedule (simplified for now)
  // For production, use node-cron package
  const intervalHours = 6; // Default to 6 hours
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Run immediately on startup
  syncFeeds().catch((error) => {
    console.error("[Feed Sync] Initial sync failed:", error);
  });

  // Schedule recurring syncs
  setInterval(() => {
    syncFeeds().catch((error) => {
      console.error("[Feed Sync] Scheduled sync failed:", error);
    });
  }, intervalMs);

  console.log(`[Feed Sync] Will sync every ${intervalHours} hours`);
}
