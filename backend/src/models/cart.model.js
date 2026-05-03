import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createArrayStore } from "../utils/localStore.js";
import { roundMoney } from "../utils/format.js";
import Product from "./product.model.js";
import Customer from "./customer.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const store = createArrayStore(resolve(__dirname, "../../data/carts.json"));

const DEFAULT_GST_RATE = Number(process.env.GST_RATE || 5);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateDiscount = (amount, discountType, discountValue) => {
  const safeAmount = Math.max(0, toNumber(amount, 0));
  const type = (discountType || "flat").toLowerCase();
  const value = Math.max(0, toNumber(discountValue, 0));

  if (!safeAmount || !value) {
    return 0;
  }

  if (type === "percent") {
    return roundMoney((safeAmount * value) / 100);
  }

  return roundMoney(Math.min(value, safeAmount));
};

const snapshotCustomer = async (payload = {}) => {
  if (payload.customerId) {
    const customer = await Customer.findOne({ _id: payload.customerId });
    if (!customer) {
      throw new Error("Customer not found");
    }

    return {
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      customerEmail: customer.email || "",
    };
  }

  return {
    customerId: payload.customerId || "",
    customerName: payload.customerName || "",
    customerPhone: payload.customerPhone || "",
    customerEmail: payload.customerEmail || "",
  };
};

const calculateCart = (cart) => {
  const baseItems = (cart.items || []).map((item) => ({
    ...item,
    quantity: toNumber(item.quantity, 0),
    unitPrice: toNumber(item.unitPrice, 0),
    discountValue: toNumber(item.discountValue, 0),
    gstRate: toNumber(item.gstRate, DEFAULT_GST_RATE),
  }));

  const lineBreakdowns = baseItems.map((item) => {
    const lineSubtotal = roundMoney(item.unitPrice * item.quantity);
    const lineDiscount = calculateDiscount(lineSubtotal, item.discountType, item.discountValue);
    const taxableBeforeCartDiscount = roundMoney(Math.max(0, lineSubtotal - lineDiscount));

    return {
      ...item,
      lineSubtotal,
      lineDiscount,
      taxableBeforeCartDiscount,
    };
  });

  const subtotal = roundMoney(
    lineBreakdowns.reduce((sum, item) => sum + item.lineSubtotal, 0)
  );
  const itemDiscountAmount = roundMoney(
    lineBreakdowns.reduce((sum, item) => sum + item.lineDiscount, 0)
  );
  const taxableTotalBeforeCartDiscount = roundMoney(
    lineBreakdowns.reduce((sum, item) => sum + item.taxableBeforeCartDiscount, 0)
  );

  const cartDiscountAmount = calculateDiscount(
    taxableTotalBeforeCartDiscount,
    cart.discountType,
    cart.discountValue
  );

  const cartDiscountAllocations = [];
  let allocatedCartDiscount = 0;

  lineBreakdowns.forEach((item, index) => {
    if (!taxableTotalBeforeCartDiscount || !cartDiscountAmount) {
      cartDiscountAllocations[index] = 0;
      return;
    }

    if (index === lineBreakdowns.length - 1) {
      cartDiscountAllocations[index] = roundMoney(
        Math.max(0, cartDiscountAmount - allocatedCartDiscount)
      );
      return;
    }

    const share = roundMoney(
      Math.min(
        item.taxableBeforeCartDiscount,
        (cartDiscountAmount * item.taxableBeforeCartDiscount) / taxableTotalBeforeCartDiscount
      )
    );
    cartDiscountAllocations[index] = share;
    allocatedCartDiscount = roundMoney(allocatedCartDiscount + share);
  });

  const enrichedItems = lineBreakdowns.map((item, index) => {
    const cartDiscountShare = roundMoney(cartDiscountAllocations[index] || 0);
    const taxableAmount = roundMoney(
      Math.max(0, item.taxableBeforeCartDiscount - cartDiscountShare)
    );
    const gstRate = toNumber(item.gstRate, DEFAULT_GST_RATE);
    const gstAmount = roundMoney((taxableAmount * gstRate) / 100);
    const lineTotal = roundMoney(taxableAmount + gstAmount);

    return {
      ...item,
      cartDiscountShare,
      taxableAmount,
      gstAmount,
      lineTotal,
      effectiveGstRate: gstRate,
    };
  });

  const taxableSubtotal = roundMoney(
    enrichedItems.reduce((sum, item) => sum + item.taxableAmount, 0)
  );
  const gstAmount = roundMoney(
    enrichedItems.reduce((sum, item) => sum + item.gstAmount, 0)
  );
  const total = roundMoney(
    enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const totalQuantity = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalDiscountAmount = roundMoney(itemDiscountAmount + cartDiscountAmount);

  return {
    ...cart,
    items: enrichedItems,
    subtotal,
    itemDiscountAmount,
    cartDiscountAmount,
    discountAmount: totalDiscountAmount,
    taxableSubtotal,
    gstAmount,
    total,
    totalQuantity,
    itemCount: enrichedItems.length,
    gstRate: toNumber(cart.gstRate, DEFAULT_GST_RATE),
  };
};

const findCart = async (cartId) => {
  const carts = await store.read();
  return carts.find((cart) => cart._id === String(cartId)) || null;
};

const saveCart = async (cart) => {
  const carts = await store.read();
  const index = carts.findIndex((item) => item._id === cart._id);

  if (index === -1) {
    carts.push(cart);
  } else {
    carts[index] = cart;
  }

  await store.write(carts);
  return cart;
};

const Cart = {
  list: async () => {
    const carts = await store.read();
    return carts.map(calculateCart);
  },

  findOne: async (query = {}) => {
    const carts = await store.read();

    if (query._id) {
      const cart = carts.find((item) => item._id === String(query._id)) || null;
      return cart ? calculateCart(cart) : null;
    }

    return carts.find((item) =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  },

  create: async (payload = {}) => {
    const now = new Date().toISOString();
    const customer = await snapshotCustomer(payload);
    const cart = {
      _id: randomUUID(),
      status: "open",
      outletId: String(payload.outletId || process.env.DEFAULT_OUTLET_ID || "main"),
      ...customer,
      notes: payload.notes || "",
      gstRate: toNumber(payload.gstRate, DEFAULT_GST_RATE),
      discountType: payload.discountType || "flat",
      discountValue: toNumber(payload.discountValue, 0),
      items: [],
      createdBy: payload.createdBy || null,
      createdAt: now,
      updatedAt: now,
    };

    await saveCart(cart);
    return calculateCart(cart);
  },

  setCustomer: async (cartId, payload = {}) => {
    const cart = await findCart(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    const customer = await snapshotCustomer(payload);
    cart.customerId = customer.customerId;
    cart.customerName = customer.customerName;
    cart.customerPhone = customer.customerPhone;
    cart.customerEmail = customer.customerEmail;
    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);

    return calculateCart(cart);
  },

  updateDiscount: async (cartId, payload = {}) => {
    const cart = await findCart(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (payload.discountType !== undefined) {
      cart.discountType = payload.discountType || "flat";
    }

    if (payload.discountValue !== undefined) {
      cart.discountValue = toNumber(payload.discountValue, cart.discountValue || 0);
    }

    if (payload.gstRate !== undefined) {
      cart.gstRate = toNumber(payload.gstRate, cart.gstRate || DEFAULT_GST_RATE);
    }

    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);

    return calculateCart(cart);
  },

  addItem: async (cartId, payload) => {
    const cart = await findCart(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status !== "open") {
      throw new Error("Cart is already closed");
    }

    const product = await Product.findOne({ _id: payload.productId });
    if (!product) {
      throw new Error("Product not found");
    }

    const quantity = Math.abs(toNumber(payload.quantity, 1));
    if (!quantity) {
      throw new Error("quantity must be greater than 0");
    }

    const unitPrice = toNumber(payload.unitPrice, product.price);
    const existingItem = cart.items.find((item) => item.productId === product._id);
    const nextItemPatch = {
      // Prefer cart-level GST for consistent POS billing (fallback to product only when cart rate missing).
      gstRate: toNumber(payload.gstRate, cart.gstRate || product.taxRate || DEFAULT_GST_RATE),
      discountType: payload.discountType || product.discountType || "flat",
      discountValue: toNumber(payload.discountValue, product.discountValue || 0),
      note: payload.note || "",
    };

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.unitPrice = unitPrice;
      Object.assign(existingItem, nextItemPatch);
    } else {
      cart.items.push({
        _id: randomUUID(),
        productId: product._id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        quantity,
        unitPrice,
        cost: toNumber(product.cost, 0),
        ...nextItemPatch,
      });
    }

    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);
    return calculateCart(cart);
  },

  updateItem: async (cartId, itemId, payload) => {
    const cart = await findCart(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status !== "open") {
      throw new Error("Cart is already closed");
    }

    const item = cart.items.find((entry) => entry._id === String(itemId));
    if (!item) {
      throw new Error("Cart item not found");
    }

    if (payload.quantity !== undefined) {
      const quantity = Math.abs(toNumber(payload.quantity, item.quantity));
      if (!quantity) {
        throw new Error("quantity must be greater than 0");
      }
      item.quantity = quantity;
    }

    if (payload.unitPrice !== undefined) {
      item.unitPrice = toNumber(payload.unitPrice, item.unitPrice);
    }

    if (payload.gstRate !== undefined) {
      item.gstRate = toNumber(payload.gstRate, item.gstRate);
    }

    if (payload.discountType !== undefined) {
      item.discountType = payload.discountType || "flat";
    }

    if (payload.discountValue !== undefined) {
      item.discountValue = toNumber(payload.discountValue, item.discountValue || 0);
    }

    if (payload.note !== undefined) {
      item.note = payload.note;
    }

    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);

    return calculateCart(cart);
  },

  removeItem: async (cartId, itemId) => {
    const cart = await findCart(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (cart.status !== "open") {
      throw new Error("Cart is already closed");
    }

    const nextItems = cart.items.filter((item) => item._id !== String(itemId));
    if (nextItems.length === cart.items.length) {
      throw new Error("Cart item not found");
    }

    cart.items = nextItems;
    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);

    return calculateCart(cart);
  },

  clear: async (cartId) => {
    const cart = await findCart(cartId);
    if (!cart) {
      return null;
    }

    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);

    return calculateCart(cart);
  },

  close: async (cartId) => {
    const cart = await findCart(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.status = "closed";
    cart.updatedAt = new Date().toISOString();
    await saveCart(cart);
    return calculateCart(cart);
  },
};

export default Cart;
