import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import { roundMoney } from "../utils/format.js";
import { generateInvoiceNumber, generateKotNumber, generateRefundNumber } from "../utils/invoice.js";
import Cart from "./cart.model.js";
import Inventory from "./inventory.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/orders.json"));

const STATUS_FLOW = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
];

const FINAL_STATUSES = ["completed", "cancelled", "refunded"];
const PAYMENT_METHODS = ["cash", "card", "upi", "wallet", "bank", "split"];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const findOrderIndex = (orders, orderId) =>
  orders.findIndex((item) => item._id === String(orderId));

const validatePayments = (payments, total) => {
  const paymentList = Array.isArray(payments) ? payments : [];

  if (!paymentList.length) {
    return {
      payments: [{ method: "cash", amount: roundMoney(total) }],
      amountPaid: roundMoney(total),
      paymentStatus: "paid",
    };
  }

  const normalized = paymentList.map((payment) => {
    const method = String(payment.method || "").toLowerCase();
    if (!PAYMENT_METHODS.includes(method)) {
      throw new Error(`Unsupported payment method: ${method}`);
    }
    return {
      method,
      amount: roundMoney(toNumber(payment.amount, 0)),
      reference: payment.reference || "",
    };
  });

  const amountPaid = roundMoney(normalized.reduce((sum, payment) => sum + payment.amount, 0));
  const paymentStatus = amountPaid >= total ? "paid" : "partially_paid";

  return {
    payments: normalized,
    amountPaid,
    paymentStatus,
  };
};

const changeOrderStock = async (order, type, notePrefix) => {
  for (const item of order.items || []) {
    await Inventory.createMovement({
      productId: item.productId,
      quantity: item.quantity,
      type,
      note: `${notePrefix} ${order.invoiceNumber}`,
    });
  }
};

const assertStatusTransition = (currentStatus, nextStatus) => {
  if (FINAL_STATUSES.includes(currentStatus)) {
    throw new Error("Order is already closed");
  }

  if (nextStatus === "cancelled" || nextStatus === "refunded") {
    return;
  }

  if (!STATUS_FLOW.includes(nextStatus)) {
    throw new Error("Invalid order status");
  }

  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  const nextIndex = STATUS_FLOW.indexOf(nextStatus);

  if (nextIndex === -1 || currentIndex === -1 || nextIndex < currentIndex) {
    throw new Error("Invalid status transition");
  }
};

const appendStatusTimeline = (order, status, actorId = null) => {
  order.statusTimeline = order.statusTimeline || [];
  order.statusTimeline.push({
    status,
    at: new Date().toISOString(),
    by: actorId,
  });
};

const sanitizeTrackingPayload = (order) => ({
  invoiceNumber: order.invoiceNumber,
  kotNumber: order.kotNumber,
  status: order.status,
  statusTimeline: order.statusTimeline || [],
  customerName: order.customerName || "",
  total: order.total,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const Order = {
  list: async () => store.read(),

  listKitchenOrders: async (statuses = ["pending", "accepted", "preparing", "ready"]) => {
    const orders = await store.read();
    return orders
      .filter((order) => statuses.includes(order.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  findOne: async (query = {}) => {
    const orders = await store.read();

    if (query._id) {
      return orders.find((item) => item._id === String(query._id)) || null;
    }

    if (query.invoiceNumber) {
      return orders.find((item) => item.invoiceNumber === String(query.invoiceNumber)) || null;
    }

    return orders.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  createFromCart: async (cartId, payload = {}) => {
    const cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
      throw new Error("Cart not found");
    }
    if (!cart.items.length) {
      throw new Error("Cart is empty");
    }
    if (cart.status !== "open") {
      throw new Error("Cart is already closed");
    }

    const now = new Date().toISOString();
    const invoiceNumber = await generateInvoiceNumber();
    const kotNumber = await generateKotNumber();

    const items = cart.items.map((item) => ({
      _id: randomUUID(),
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      quantity: item.quantity,
      unitPrice: roundMoney(item.unitPrice),
      gstRate: roundMoney(item.effectiveGstRate || item.gstRate || cart.gstRate || 0),
      lineSubtotal: roundMoney(item.lineSubtotal || item.quantity * item.unitPrice),
      lineDiscount: roundMoney(item.lineDiscount || 0),
      taxableAmount: roundMoney(item.taxableAmount || 0),
      gstAmount: roundMoney(item.gstAmount || 0),
      lineTotal: roundMoney(item.lineTotal || 0),
      note: item.note || "",
    }));

    const subtotal = roundMoney(cart.subtotal || 0);
    const itemDiscountAmount = roundMoney(cart.itemDiscountAmount || 0);
    const cartDiscountAmount = roundMoney(cart.cartDiscountAmount || 0);
    const discountAmount = roundMoney(cart.discountAmount || 0);
    const taxableSubtotal = roundMoney(cart.taxableSubtotal || 0);
    const gstAmount = roundMoney(cart.gstAmount || 0);
    const total = roundMoney(cart.total || 0);
    const paymentPayload = validatePayments(payload.payments, total);

    const order = {
      _id: randomUUID(),
      invoiceNumber,
      kotNumber,
      cartId: cart._id,
      status: "pending",
      statusTimeline: [],
      customerId: payload.customerId || cart.customerId || "",
      customerName: payload.customerName || cart.customerName || "",
      customerPhone: payload.customerPhone || cart.customerPhone || "",
      customerEmail: payload.customerEmail || cart.customerEmail || "",
      orderSource: payload.orderSource || "counter",
      tableNo: payload.tableNo || "",
      waiterName: payload.waiterName || "",
      notes: payload.notes || cart.notes || "",
      items,
      subtotal,
      itemDiscountAmount,
      cartDiscountAmount,
      discountAmount,
      taxableSubtotal,
      gstAmount,
      gstRate: roundMoney(payload.gstRate ?? cart.gstRate ?? 0),
      total,
      payments: paymentPayload.payments,
      amountPaid: paymentPayload.amountPaid,
      paymentStatus: paymentPayload.paymentStatus,
      changeDue: roundMoney(Math.max(0, paymentPayload.amountPaid - total)),
      createdBy: payload.createdBy || cart.createdBy || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      cancelledAt: null,
      refundedAt: null,
      cancelReason: "",
      refundReason: "",
      refundNumber: "",
      refundAmount: 0,
    };

    appendStatusTimeline(order, "pending", payload.createdBy || null);

    await changeOrderStock(order, "out", "Order sale");

    const orders = await store.read();
    orders.push(order);
    await store.write(orders);
    await Cart.close(cart._id);

    return order;
  },

  updateStatus: async (orderId, nextStatus, actorId = null) => {
    const orders = await store.read();
    const index = findOrderIndex(orders, orderId);
    if (index === -1) {
      throw new Error("Order not found");
    }

    const order = orders[index];
    const normalizedStatus = String(nextStatus || "").toLowerCase();
    assertStatusTransition(order.status, normalizedStatus);

    order.status = normalizedStatus;
    order.updatedAt = new Date().toISOString();

    if (normalizedStatus === "completed") {
      order.completedAt = order.updatedAt;
    }

    appendStatusTimeline(order, normalizedStatus, actorId);
    orders[index] = order;
    await store.write(orders);
    return order;
  },

  cancelOrder: async (orderId, payload = {}) => {
    const orders = await store.read();
    const index = findOrderIndex(orders, orderId);
    if (index === -1) {
      throw new Error("Order not found");
    }

    const order = orders[index];
    assertStatusTransition(order.status, "cancelled");

    await changeOrderStock(order, "in", "Order cancel");

    order.status = "cancelled";
    order.cancelReason = payload.reason || "";
    order.cancelledAt = new Date().toISOString();
    order.updatedAt = order.cancelledAt;
    appendStatusTimeline(order, "cancelled", payload.by || null);
    orders[index] = order;
    await store.write(orders);
    return order;
  },

  refundOrder: async (orderId, payload = {}) => {
    const orders = await store.read();
    const index = findOrderIndex(orders, orderId);
    if (index === -1) {
      throw new Error("Order not found");
    }

    const order = orders[index];
    assertStatusTransition(order.status, "refunded");

    await changeOrderStock(order, "in", "Order refund");

    order.status = "refunded";
    order.refundReason = payload.reason || "";
    order.refundedAt = new Date().toISOString();
    order.refundNumber = await generateRefundNumber();
    order.refundAmount = roundMoney(payload.refundAmount ?? order.total);
    order.updatedAt = order.refundedAt;
    appendStatusTimeline(order, "refunded", payload.by || null);
    orders[index] = order;
    await store.write(orders);
    return order;
  },

  getTracking: async (invoiceNumber) => {
    const order = await Order.findOne({ invoiceNumber });
    if (!order) {
      return null;
    }
    return sanitizeTrackingPayload(order);
  },
};

export default Order;
