import { body, oneOf } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("role").optional().isIn(["admin", "manager", "cashier"]),
  body("phone").optional().isString(),
];

export const loginValidator = [
  oneOf([
    body("email").isEmail().normalizeEmail(),
    body("email").matches(/^\+?[0-9]{10,15}$/),
    body("phone").matches(/^\+?[0-9]{10,15}$/),
  ]),
  body("password").notEmpty(),
];

export const pinLoginValidator = [body("pin").matches(/^\d{4,6}$/).withMessage("PIN must be 4 to 6 digits")];
