import { Queue, Worker } from "bullmq";
import { getRedis } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import Order from "../models/Order.js";
import Refund from "../models/Refund.js";
import { pdfService } from "../services/pdf.service.js";

const connection = getRedis();
const noopQueue = { add: async () => null };

export const invoiceQueue = connection ? new Queue("invoice-email", { connection }) : noopQueue;
export const notificationQueue = connection ? new Queue("notifications", { connection }) : noopQueue;
export const refundQueue = connection ? new Queue("refund-processing", { connection }) : noopQueue;
export const salesReportQueue = connection ? new Queue("scheduled-sales-reports", { connection }) : noopQueue;

export const startWorkers = () => {
  if (!connection) {
    logger.warn("Redis is not configured; BullMQ workers are disabled");
    return [];
  }
  return [
    new Worker(
      "invoice-email",
      async (job) => {
        const order = await Order.findById(job.data.orderId);
        if (!order) return;
        await pdfService.invoice(order);
        logger.info("Invoice generated for email queue", { orderId: order._id });
      },
      { connection }
    ),
    new Worker(
      "refund-processing",
      async (job) => {
        await Refund.findByIdAndUpdate(job.data.refundId, { refundStatus: "success" });
      },
      { connection }
    ),
    new Worker("notifications", async (job) => logger.info("Notification job", job.data), { connection }),
    new Worker("scheduled-sales-reports", async (job) => logger.info("Scheduled sales report", job.data), { connection }),
  ];
};
