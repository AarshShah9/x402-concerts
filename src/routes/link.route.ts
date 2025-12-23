import express from "express";
import { callback, init } from "../controllers/link.controller";
import { asyncHandler } from "../middleware/asyncHandler";

const router = express.Router();

router.post("/init", asyncHandler(init));
router.get("/callback", asyncHandler(callback));

export default router;
