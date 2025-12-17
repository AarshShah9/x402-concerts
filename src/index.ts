import express from "express";
import type { Request, Response } from "express";
import { env } from "./lib/env";

const app = express();

app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).send("OK");
});

app.listen(env.PORT, (): void => {
  console.log(`Server is running at http://localhost:${env.PORT}`);
});