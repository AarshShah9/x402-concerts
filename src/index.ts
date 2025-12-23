import express from "express";
import type { Request, Response } from "express";
import { env } from "./lib/env";
import morgan from "morgan";
import prisma from "./lib/prisma";
import linkRoute from "./routes/link.route";
import concertRoute from "./routes/concert.route";
import { errorHandler } from "./middleware/errorHandler";
import { asyncHandler } from "./middleware/asyncHandler";

const app = express();

app.use(morgan("dev")); // logging middleware
app.use(express.json()); // parse json body
app.use(express.urlencoded({ extended: true })); // parse url encoded body

app.use(`/api/${env.API_VERSION}/link`, linkRoute);
app.use(`/api/${env.API_VERSION}/concert`, concertRoute);
app.get(
  `/api/${env.API_VERSION}/health`,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // check db connection
    await prisma.linkSession.findFirst();
    res.status(200).send("OK");
  }),
);

app.use(errorHandler);
app.listen(env.PORT, (): void => {
  console.log(`Server is running at http://localhost:${env.PORT}`);
});
