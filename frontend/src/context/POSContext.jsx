import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const POSContext = createContext(null);

const DEMO_PRODUCTS = [
  { id: "demo-1", productId: "", name: "Masala Tea", price: 30, category: "Tea", stock: 999, type: "veg" },
  { id: "demo-2", productId: "", name: "Cold Coffee", price: 120, category: "Coffee", stock: 999, type: "veg" },
  { id: "demo-3", productId: "", name: "Veg Burger", price: 149, category: "Burger", stock: 999, type: "veg" },
  { id: "demo-4", productId: "", name: "Cheese Pizza", price: 299, category: "Pizza", stock: 999, type: "veg" },
  { id: "demo-5", productId: "", name: "Brownie", price: 99, category: "Dessert", stock: 999, type: "veg" },
  { id: "demo-6", productId: "", name: "Tea Combo", price: 199, category: "Combos", stock: 999, type: "veg" },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const normalizeLookup = (value) => String(value || "").trim().toLowerCase();
const round2 = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const GST_RATE_PERCENT = 5;

export function POSProvider({ children }) {
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [menuStatus, setMenuStatus] = useState("Loading menu...");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [orderType, setOrderType] = useState("dinein");
  const [customer, setCustomer] = useState("Walk-in");
  const [table, setTable] = useState("T1");
  const [shift, setShift] = useState("Morning Shift");
  const [cashier] = useState("Cashier Asha");
  const [waiterName, setWaiterName] = useState("Waiter 1");
  const [barcodeTerm, setBarcodeTerm] = useState("");

  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentMode, setPaymentMode] = useState("single");
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "" },
    { method: "upi", amount: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const [heldOrders, setHeldOrders] = useState([]);

  const queueOrderForSync = (payload) => {
    const key = "paylio-offline-orders";
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    current.push({
      id: `offline-${Date.now()}`,
      payload,
      queuedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(current));
  };

  const syncOfflineOrders = async () => {
    const key = "paylio-offline-orders";
    const current = JSON.parse(localStorage.getItem(key) || "[]");
    if (!current.length || !navigator.onLine) return;

    const pending = [];
    for (const row of current) {
      try {
        const response = await fetch("/api/public/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.payload),
        });
        if (!response.ok) {
          pending.push(row);
        }
      } catch {
        pending.push(row);
      }
    }

    localStorage.setItem(key, JSON.stringify(pending));
  };

  const loadCatalog = async () => {
    try {
      const menuRes = await fetch("/api/public/menu");

      const menuData = await menuRes.json();
      const menu = Array.isArray(menuData.menu) ? menuData.menu : [];
      const mapped = menu.map((item, idx) => ({
        id: item._id || `p-${idx}`,
        productId: item._id || "",
        name: item.name || "Unnamed",
        price: Number(item.price || 0),
        category: item.categoryName || "Uncategorized",
        sku: item.sku || "",
        stock: Number(item.stock || 99),
        type: "veg",
      }));

      if (!mapped.length) {
        setMenuStatus("Demo menu loaded. Add backend products for live billing.");
        return;
      }

      setProducts(mapped);
      setMenuStatus(`Live menu synced (${mapped.length} items)`);
    } catch {
      setMenuStatus("Backend offline. Running in demo mode.");
    }
  };

  useEffect(() => {
    loadCatalog();
    syncOfflineOrders();
    const onOnline = () => {
      syncOfflineOrders();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const categories = useMemo(() => {
    const base = ["Favorites", ...new Set(products.map((item) => item.category).filter(Boolean))];
    return ["All", ...base];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory =
        selectedCategory === "All" ||
        (selectedCategory === "Favorites" ? product.price >= 120 : product.category === selectedCategory);
      const bySearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      return byCategory && bySearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const subtotal = useMemo(
    () => round2(cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0)),
    [cartItems]
  );
  const safeDiscount = Math.max(0, round2(Number(discount || 0)));
  const taxableSubtotal = Math.max(0, round2(subtotal - safeDiscount));
  const tax = round2((taxableSubtotal * GST_RATE_PERCENT) / 100);
  const total = Math.max(0, round2(taxableSubtotal + tax));

  const addToCart = (product) => {
    if (Number(product?.stock || 0) <= 0) {
      return false;
    }

    setCartItems((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...current, { ...product, qty: 1 }];
    });

    return true;
  };

  const addByBarcodeOrSku = (code) => {
    const normalized = String(code || "").trim().toLowerCase();
    if (!normalized) return false;
    const matched = products.find((item) => String(item.sku || "").trim().toLowerCase() === normalized);
    if (!matched) return false;
    addToCart(matched);
    return true;
  };

  const updateQty = (id, delta) => {
    setCartItems((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id) => {
    setCartItems((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscount(0);
    setPaymentMode("single");
    setSplitPayments([
      { method: "cash", amount: "" },
      { method: "upi", amount: "" },
    ]);
  };

  const holdCurrentOrder = () => {
    if (!cartItems.length) return;
    setHeldOrders((current) => [
      ...current,
      {
        id: `hold-${Date.now()}`,
        createdAt: new Date().toISOString(),
        customer,
        table,
        orderType,
        items: cartItems,
        discount: safeDiscount,
      },
    ]);
    clearCart();
  };

  const restoreHeldOrder = (id) => {
    const target = heldOrders.find((item) => item.id === id);
    if (!target) return;
    setCartItems(target.items || []);
    setDiscount(target.discount || 0);
    setCustomer(target.customer || "Walk-in");
    setTable(target.table || "T1");
    setOrderType(target.orderType || "dinein");
    setHeldOrders((current) => current.filter((item) => item.id !== id));
  };

  const splitCurrentBill = () => {
    if (!cartItems.length) return;
    const partA = [];
    const partB = [];
    for (const item of cartItems) {
      const qty = Number(item.qty || 0);
      const qtyA = Math.ceil(qty / 2);
      const qtyB = Math.floor(qty / 2);
      if (qtyA > 0) partA.push({ ...item, qty: qtyA });
      if (qtyB > 0) partB.push({ ...item, qty: qtyB });
    }

    if (!partB.length) {
      window.alert("Add more quantity to split this bill.");
      return;
    }

    setCartItems(partA);
    setHeldOrders((current) => [
      ...current,
      {
        id: `hold-${Date.now()}`,
        createdAt: new Date().toISOString(),
        customer: `${customer} (Split B)`,
        table,
        orderType,
        items: partB,
        discount: 0,
      },
    ]);
    setDiscount(0);
  };

  const mergeHeldOrder = (id) => {
    const target = heldOrders.find((item) => item.id === id);
    if (!target) return;

    const merged = [...cartItems];
    for (const item of target.items || []) {
      const idx = merged.findIndex(
        (curr) =>
          String(curr.productId || "") === String(item.productId || "") &&
          String(curr.name || "").toLowerCase() === String(item.name || "").toLowerCase()
      );
      if (idx === -1) {
        merged.push({ ...item });
      } else {
        merged[idx] = {
          ...merged[idx],
          qty: Number(merged[idx].qty || 0) + Number(item.qty || 0),
        };
      }
    }

    setCartItems(merged);
    setDiscount((curr) => Number(curr || 0) + Number(target.discount || 0));
    setHeldOrders((current) => current.filter((item) => item.id !== id));
  };

  const buildPayments = () => {
    if (paymentMode !== "split") {
      return [{ method: paymentMethod, amount: total }];
    }

    return splitPayments
      .map((row) => ({
        method: row.method,
        amount: Number(row.amount || 0),
      }))
      .filter((row) => row.amount > 0);
  };

  const resolveBackendItems = async (items = []) => {
    const unsynced = items.filter((item) => !item.productId);
    if (!unsynced.length) return items;

    let catalog = [];
    try {
      const listRes = await fetch("/api/products");
      const listData = await listRes.json();
      catalog = Array.isArray(listData.products) ? listData.products : [];
    } catch {
      // handled by create fallback below
    }

    const byKey = new Map();
    for (const product of catalog) {
      const nameKey = normalizeLookup(product.name);
      const skuKey = normalizeLookup(product.sku);
      if (nameKey) byKey.set(`name:${nameKey}`, product);
      if (skuKey) byKey.set(`sku:${skuKey}`, product);
    }

    const resolved = [];
    for (const item of items) {
      if (item.productId) {
        resolved.push(item);
        continue;
      }

      const nameKey = normalizeLookup(item.name);
      const skuKey = normalizeLookup(item.sku);
      let matched = byKey.get(`sku:${skuKey}`) || byKey.get(`name:${nameKey}`);

      if (!matched) {
        const createRes = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            sku: item.sku || `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            price: Number(item.price || 0),
            cost: 0,
            taxRate: GST_RATE_PERCENT,
            lowStockThreshold: 5,
            unit: "pcs",
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok || !createData?.product?._id) {
          throw new Error(createData.message || `Unable to sync product "${item.name}"`);
        }
        matched = createData.product;
        byKey.set(`name:${nameKey}`, matched);
        if (matched.sku) byKey.set(`sku:${normalizeLookup(matched.sku)}`, matched);
      } else if (Number(matched.taxRate ?? matched.gstRate ?? GST_RATE_PERCENT) !== GST_RATE_PERCENT) {
        try {
          const patchRes = await fetch(`/api/products/${matched._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taxRate: GST_RATE_PERCENT }),
          });
          const patchData = await patchRes.json();
          if (patchRes.ok && patchData?.product?._id) {
            matched = patchData.product;
          }
        } catch {
          // keep flow non-blocking; backend cart GST precedence still enforces expected rate.
        }
      }

      resolved.push({
        ...item,
        productId: matched._id,
        id: matched._id,
        sku: matched.sku || item.sku || "",
        name: matched.name || item.name,
      });
    }

    return resolved;
  };

  const saveOrder = async () => {
    if (!cartItems.length || isSaving) return;

    const payments = buildPayments();
    const paidAmount = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    if (!payments.length || paidAmount < total) {
      window.alert("Payment amount is less than total. Please complete payment.");
      return;
    }

    let resolvedItems = cartItems;
    try {
      setIsSaving(true);
      resolvedItems = await resolveBackendItems(cartItems);
      setCartItems(resolvedItems);

      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: "main",
          orderType: orderType === "takeaway" ? "pickup" : orderType,
          orderSource: "counter",
          customerName: customer,
          tableNo: orderType === "dinein" ? table : "",
          waiterName: waiterName || "",
          notes: "",
          discountAmount: safeDiscount,
          items: resolvedItems.map((item) => ({
            productId: item.productId,
            quantity: item.qty,
            unitPrice: item.price,
          })),
          payments,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to save order");
      }

      window.alert(`Order saved: ${data.order?.invoiceNumber || "N/A"}`);
      clearCart();
      setPaymentMethod("cash");
    } catch (error) {
      const message = String(error?.message || "");
      const isStockError = /insufficient stock/i.test(message);
      const isValidationError =
        isStockError ||
        /product not found|quantity must be|invalid|unsupported|payment amount/i.test(message);

      if (isValidationError) {
        window.alert(message || "Unable to save order");
        return;
      }

      const payload = {
        outletId: "main",
        orderType: orderType === "takeaway" ? "pickup" : orderType,
        orderSource: "counter",
        customerName: customer,
        tableNo: orderType === "dinein" ? table : "",
        waiterName: waiterName || "",
        notes: "",
        discountAmount: safeDiscount,
        items: resolvedItems.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          unitPrice: item.price,
        })),
        payments,
      };
      queueOrderForSync(payload);
      window.alert(`Network issue. Order queued offline for auto-sync. (${message || "sync pending"})`);
    } finally {
      setIsSaving(false);
    }
  };

  const value = {
    products,
    menuStatus,
    loadCatalog,
    categories,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    orderType,
    setOrderType,
    customer,
    setCustomer,
    table,
    setTable,
    shift,
    setShift,
    cashier,
    waiterName,
    setWaiterName,
    barcodeTerm,
    setBarcodeTerm,
    addByBarcodeOrSku,
    cartItems,
    addToCart,
    updateQty,
    removeItem,
    discount: safeDiscount,
    setDiscount,
    subtotal,
    tax,
    total,
    paymentMethod,
    setPaymentMethod,
    paymentMode,
    setPaymentMode,
    splitPayments,
    setSplitPayments,
    isSaving,
    saveOrder,
    clearCart,
    holdCurrentOrder,
    splitCurrentBill,
    heldOrders,
    restoreHeldOrder,
    mergeHeldOrder,
    formatMoney,
  };

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export function usePOS() {
  const ctx = useContext(POSContext);
  if (!ctx) {
    throw new Error("usePOS must be used inside POSProvider");
  }
  return ctx;
}
