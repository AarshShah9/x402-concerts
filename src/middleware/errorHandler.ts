import axios from "axios";
import { NextFunction, Request, Response } from "express";

export const errorHandler = (
    err: Error, 
    _req: Request, 
    res: Response, 
    _next: NextFunction
) => {
    console.error(err);
    
    // Handle specific error types
    if (err.name === 'ZodError') {
        return res.status(400).json({ error: "Validation failed" });
    }
    
    if (axios.isAxiosError(err)) {
        return res.status(502).json({ error: "External service error" });
    }
    
    // Default error
    return res.status(500).json({ error: "Internal server error" });
};
