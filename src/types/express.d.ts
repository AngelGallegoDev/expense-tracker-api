import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      requestId?: string 
    }
  }
}
export {};