import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("role").optional().isIn(["admin", "manager", "cashier"]),
  body("phone").optional().isString(),
];

export const loginValidator = [body("email").isEmail().normalizeEmail(), body("password").notEmpty()];
