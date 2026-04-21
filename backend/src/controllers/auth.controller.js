import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const getJwtSecret = () => process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
const getJwtExpiry = () => process.env.ACCESS_TOKEN_EXPIRY || "1d";

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : user;
  const { password, ...safeUser } = plainUser;
  return safeUser;
};

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password, pin, role, outletId, isHeadOffice } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      pin: pin || "",
      role: role || "cashier",
      outletId: outletId || process.env.DEFAULT_OUTLET_ID || "main",
      isHeadOffice: Boolean(isHeadOffice)
    });

    res.status(201).json({
      message: "User registered successfully",
      user: sanitizeUser(user)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        outletId: user.outletId || process.env.DEFAULT_OUTLET_ID || "main",
        isHeadOffice: Boolean(user.isHeadOffice)
      },
      jwtSecret,
      { expiresIn: getJwtExpiry() }
    );

    res.json({
      message: "Login successful",
      token,
      user: sanitizeUser(user)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PIN LOGIN (cashier / waiter quick access)
export const loginWithPin = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: "pin is required" });
    }

    const user = await User.findOne({ pin: String(pin).trim() });
    if (!user) {
      return res.status(400).json({ message: "Invalid PIN" });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        outletId: user.outletId || process.env.DEFAULT_OUTLET_ID || "main",
        isHeadOffice: Boolean(user.isHeadOffice)
      },
      jwtSecret,
      { expiresIn: getJwtExpiry() }
    );

    res.json({
      message: "PIN login successful",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
