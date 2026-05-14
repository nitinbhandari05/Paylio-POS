import { connectDatabase, closeDatabase } from "../config/database.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";

await connectDatabase();

const admin = await User.findOneAndUpdate(
  { email: "admin@smartpos.local" },
  { name: "Admin", email: "admin@smartpos.local", password: "Password123", role: "admin", phone: "9999999999" },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const category = await Category.findOneAndUpdate(
  { name: "Beverages" },
  { name: "Beverages", description: "Drinks and cold beverages" },
  { upsert: true, new: true }
);

await Product.findOneAndUpdate(
  { sku: "COFFEE-001" },
  {
    name: "Cold Coffee",
    sku: "COFFEE-001",
    barcode: "890000000001",
    categoryId: category._id,
    price: 120,
    costPrice: 55,
    taxPercentage: 5,
    stock: 50,
    lowStockThreshold: 10,
    createdBy: admin._id,
  },
  { upsert: true, new: true }
);

await Coupon.findOneAndUpdate(
  { code: "WELCOME10" },
  { code: "WELCOME10", discountType: "percentage", discountValue: 10, expiryDate: new Date(Date.now() + 30 * 864e5), minimumOrderValue: 200, usageLimit: 100 },
  { upsert: true, new: true }
);

console.log("Seed data inserted");
await closeDatabase();
