import crypto from "node:crypto";
import Payment from "../models/Payment.js";
import Refund from "../models/Refund.js";
import Order from "../models/Order.js";
import { orderService } from "./order.service.js";
import { refundQueue } from "../jobs/queues.js";
import { emitPaymentSuccess } from "../sockets/index.js";
import { AppError } from "../utils/AppError.js";

export const paymentService = {
  async create({ orderId, gateway = "razorpay_mock" }) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    return Payment.create({
      orderId,
      transactionId: `pay_${crypto.randomUUID()}`,
      gateway,
      amount: order.grandTotal,
      status: "created",
    });
  },
  async webhook(payload) {
    const payment = await Payment.findOneAndUpdate(
      { transactionId: payload.transactionId },
      { status: payload.status || "paid", paidAt: new Date(), rawPayload: payload },
      { new: true }
    );
    if (!payment) throw new AppError("Payment not found", 404);
    if (payment.status === "paid") {
      const order = await orderService.markPaid(payment.orderId, payment);
      emitPaymentSuccess({ payment, order });
    }
    return payment;
  },
  async get(id) {
    const payment = await Payment.findById(id).populate("orderId");
    if (!payment) throw new AppError("Payment not found", 404);
    return payment;
  },
  async refund({ orderId, reason, amount }) {
    const payment = await Payment.findOne({ orderId, status: "paid" });
    if (!payment) throw new AppError("Paid payment not found", 404);
    const refund = await Refund.create({ orderId, paymentId: payment._id, reason, amount: amount || payment.amount });
    await refundQueue.add("process-refund", { refundId: refund._id.toString() });
    return refund;
  },
};
