import "express";
import "express-serve-static-core";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      requestId?: string
    }
  }
}

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}
export { };