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
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export function POSProvider({ children }) {
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [masterCategories, setMasterCategories] = useState([]);
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
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitAmounts, setSplitAmounts] = useState({ cash: 0, card: 0, upi: 0 });
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
      const [menuRes, categoryRes] = await Promise.all([
        fetch("/api/public/menu"),
        fetch("/api/categories"),
      ]);

      const menuData = await menuRes.json();
      const categoryData = await categoryRes.json();
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

      const categories = Array.isArray(categoryData.categories) ? categoryData.categories : [];
      setMasterCategories(categories);

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

  const quickAddCategory = async (payload) => {
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to create category");
    await loadCatalog();
    return data.category;
  };

  const quickAddProduct = async (payload) => {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to create product");
    await loadCatalog();
    return data.product;
  };

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
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );
  const tax = Math.round(subtotal * 0.05);
  const safeDiscount = Math.max(0, Number(discount || 0));
  const total = Math.max(0, subtotal + tax - safeDiscount);

  const addToCart = (product) => {
    setCartItems((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
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
    setNote("");
    setSplitAmounts({ cash: 0, card: 0, upi: 0 });
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
        note,
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
    setNote(target.note || "");
    setCustomer(target.customer || "Walk-in");
    setTable(target.table || "T1");
    setOrderType(target.orderType || "dinein");
    setHeldOrders((current) => current.filter((item) => item.id !== id));
  };

  const buildPayments = () => {
    if (paymentMethod !== "split") {
      return [{ method: paymentMethod, amount: total }];
    }

    const payments = ["cash", "card", "upi"]
      .map((method) => ({ method, amount: Number(splitAmounts[method] || 0) }))
      .filter((row) => row.amount > 0);

    return payments;
  };

  const saveOrder = async () => {
    if (!cartItems.length || isSaving) return;

    const hasUnsyncedItems = cartItems.some((item) => !item.productId);
    if (hasUnsyncedItems) {
      window.alert("Live billing requires backend products. Demo items cannot be billed.");
      return;
    }

    const payments = buildPayments();
    const paidAmount = payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    if (!payments.length || paidAmount < total) {
      window.alert("Payment amount is less than total. Please complete payment.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: "main",
          orderType,
          orderSource: "counter",
          customerName: customer,
          tableNo: orderType === "dinein" ? table : "",
          waiterName: waiterName || "",
          notes: note,
          items: cartItems.map((item) => ({
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
      setSplitOpen(false);
    } catch (error) {
      const payload = {
        outletId: "main",
        orderType,
        orderSource: "counter",
        customerName: customer,
        tableNo: orderType === "dinein" ? table : "",
        waiterName: waiterName || "",
        notes: note,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          unitPrice: item.price,
        })),
        payments,
      };
      queueOrderForSync(payload);
      window.alert(`Network issue. Order queued offline for auto-sync. (${error.message || "sync pending"})`);
    } finally {
      setIsSaving(false);
    }
  };

  const value = {
    products,
    menuStatus,
    masterCategories,
    loadCatalog,
    quickAddCategory,
    quickAddProduct,
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
    note,
    setNote,
    subtotal,
    tax,
    total,
    paymentMethod,
    setPaymentMethod,
    splitOpen,
    setSplitOpen,
    splitAmounts,
    setSplitAmounts,
    isSaving,
    saveOrder,
    holdCurrentOrder,
    heldOrders,
    restoreHeldOrder,
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
