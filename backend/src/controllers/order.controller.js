import { orderService } from "../services/order.service.js";
import { paymentService } from "../services/payment.service.js";
import { pdfService } from "../services/pdf.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/apiResponse.js";

export const createOrder = asyncHandler(async (req, res) =>
  successResponse(res, await orderService.create(req.body, req.user._id), "Order created", 201)
);
export const listOrders = asyncHandler(async (req, res) => successResponse(res, await orderService.list(req.query), "Orders"));
export const getOrder = asyncHandler(async (req, res) => successResponse(res, await orderService.get(req.params.id), "Order"));
export const updateOrderStatus = asyncHandler(async (req, res) =>
  successResponse(res, await orderService.updateStatus(req.params.id, req.body.status), "Order status updated")
);
export const cancelOrder = asyncHandler(async (req, res) => successResponse(res, await orderService.cancel(req.params.id, req.user._id), "Order cancelled"));
export const refundOrder = asyncHandler(async (req, res) =>
  successResponse(res, await paymentService.refund({ orderId: req.params.id, ...req.body }), "Refund queued", 202)
);
export const invoice = asyncHandler(async (req, res) => {
  const order = await orderService.get(req.params.id);
  const buffer = await pdfService.invoice(order);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${order.orderNumber}.pdf`);
  res.send(buffer);
});
