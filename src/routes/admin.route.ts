import express from "express";
import { syncFeed } from "../controllers/admin.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = express.Router();

router.post("/sync-feed", asyncHandler(syncFeed));

export default router;
