-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('TICKETMASTER');

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "imageUrl" TEXT,
    "externalLinks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "imageUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "startDateTime" TIMESTAMP(3),
    "timezone" TEXT,
    "dateTBD" BOOLEAN NOT NULL DEFAULT false,
    "dateTBA" BOOLEAN NOT NULL DEFAULT false,
    "onsaleStartDate" TIMESTAMP(3),
    "onsaleEndDate" TIMESTAMP(3),
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "currency" TEXT,
    "genreName" TEXT,
    "segmentName" TEXT,
    "venueId" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttraction" (
    "eventId" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,

    CONSTRAINT "EventAttraction_pkey" PRIMARY KEY ("eventId","attractionId")
);

-- CreateTable
CREATE TABLE "FeedSyncStatus" (
    "id" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "country" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "eventsIngested" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedSyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attraction_name_idx" ON "Attraction"("name");

-- CreateIndex
CREATE INDEX "Attraction_source_idx" ON "Attraction"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Attraction_source_sourceId_key" ON "Attraction"("source", "sourceId");

-- CreateIndex
CREATE INDEX "Venue_country_idx" ON "Venue"("country");

-- CreateIndex
CREATE INDEX "Venue_latitude_longitude_idx" ON "Venue"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Venue_source_idx" ON "Venue"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_source_sourceId_key" ON "Venue"("source", "sourceId");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");

-- CreateIndex
CREATE INDEX "Event_segmentName_idx" ON "Event"("segmentName");

-- CreateIndex
CREATE INDEX "Event_isTest_idx" ON "Event"("isTest");

-- CreateIndex
CREATE INDEX "Event_source_idx" ON "Event"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Event_source_sourceId_key" ON "Event"("source", "sourceId");

-- CreateIndex
CREATE INDEX "EventAttraction_attractionId_idx" ON "EventAttraction"("attractionId");

-- CreateIndex
CREATE INDEX "EventAttraction_eventId_idx" ON "EventAttraction"("eventId");

-- CreateIndex
CREATE INDEX "FeedSyncStatus_source_status_idx" ON "FeedSyncStatus"("source", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FeedSyncStatus_source_country_key" ON "FeedSyncStatus"("source", "country");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttraction" ADD CONSTRAINT "EventAttraction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttraction" ADD CONSTRAINT "EventAttraction_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
