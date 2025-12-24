import { Request, Response } from "express";
import { syncFeeds } from "../workers/feed-ingestor";
import { SyncFeedSchema } from "../lib/types";

export const syncFeed = async (req: Request, res: Response): Promise<void> => {
  const { source } = SyncFeedSchema.parse(req.query);

  if (source) {
    res.status(202).json({
      message: `Feed sync started for ${source}`,
      note: "This is a background operation. Check FeedSyncStatus for progress.",
    });
  } else {
    res.status(202).json({
      message: "Feed sync started for all sources",
      note: "This is a background operation. Check FeedSyncStatus for progress.",
    });
  }

  // Run sync in background (don't await)
  syncFeeds().catch((error) => {
    console.error("[Admin] Feed sync failed:", error);
  });
};
