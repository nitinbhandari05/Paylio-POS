import { validationResult } from "express-validator";
import { AppError } from "../utils/AppError.js";
import { errorResponse } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const validateRequest = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return next(new AppError("Validation failed", 422, result.array()));
};

export const notFoundHandler = (req, _res, next) =>
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || (error.name === "CastError" ? 400 : 500);
  const message = error.name === "ValidationError" ? "Validation failed" : error.message;
  logger.error(message, { stack: error.stack, errors: error.errors });
  return errorResponse(res, message, statusCode, error.errors);
};
