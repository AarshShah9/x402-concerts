import express from "express";
import { callback, init } from "../controllers/link.controller";

const router = express.Router();

router.post("/init", init);
router.get("/callback", callback);

export default router;
