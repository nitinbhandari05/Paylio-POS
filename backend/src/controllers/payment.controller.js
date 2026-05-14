import { paymentService } from "../services/payment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";

export const createPayment = asyncHandler(async (req, res) =>
  successResponse(res, await paymentService.create(req.body), "Payment created", 201)
);
export const paymentWebhook = asyncHandler(async (req, res) =>
  successResponse(res, await paymentService.webhook(req.body), "Webhook processed")
);
export const getPayment = asyncHandler(async (req, res) => successResponse(res, await paymentService.get(req.params.id), "Payment"));
