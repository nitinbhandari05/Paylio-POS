import { body, param } from "express-validator";

export const mongoIdParam = (name = "id") => [param(name).isMongoId()];

export const productValidator = [
  body("name").trim().notEmpty(),
  body("sku").trim().notEmpty(),
  body("categoryId").isMongoId(),
  body("price").isFloat({ min: 0 }),
  body("costPrice").optional().isFloat({ min: 0 }),
  body("taxPercentage").optional().isFloat({ min: 0 }),
  body("stock").optional().isInt({ min: 0 }),
];

export const orderValidator = [
  body("items").isArray({ min: 1 }),
  body("items.*.productId").isMongoId(),
  body("items.*.quantity").isInt({ min: 1 }),
  body("customerId").optional({ nullable: true }).isMongoId(),
];

export const inventoryValidator = [
  body("productId").isMongoId(),
  body("quantity").isFloat({ min: 0.01 }),
];
