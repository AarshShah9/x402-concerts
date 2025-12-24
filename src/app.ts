import express from "express";
import type { Request, Response } from "express";
import { env } from "./lib/env.js";
import morgan from "morgan";
import prisma from "./lib/prisma.js";
import linkRoute from "./routes/link.route.js";
import concertRoute from "./routes/concert.route.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import adminRoute from "./routes/admin.route.js";

const app = express();

app.use(morgan("dev")); // logging middleware
app.use(express.json()); // parse json body
app.use(express.urlencoded({ extended: true })); // parse url encoded body

app.use(`/api/${env.API_VERSION}/link`, linkRoute);
app.use(`/api/${env.API_VERSION}/concert`, concertRoute);
app.use(`/api/${env.API_VERSION}/admin`, adminRoute);
app.get(
  `/api/${env.API_VERSION}/health`,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // check db connection
    await prisma.linkSession.findFirst();
    res.status(200).send("OK");
  }),
);

app.use(errorHandler);

export default app;
