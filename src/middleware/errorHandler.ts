import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.flatten().fieldErrors,
    });
  }

  // Handle Axios errors (fallback for any unhandled external service errors)
  if (axios.isAxiosError(err)) {
    return res.status(502).json({ error: "External service error" });
  }

  // Log unexpected errors
  console.error("Unexpected error:", err);

  // Default error response (don't leak error details)
  return res.status(500).json({ error: "Internal server error" });
};
