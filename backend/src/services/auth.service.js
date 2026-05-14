import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id, tokenId: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

const sanitizeUser = (user) => {
  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.pin;
  delete safeUser.refreshTokens;
  return safeUser;
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.lastLogin = new Date();
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save();
  return { user: sanitizeUser(user), accessToken, refreshToken };
};

export const authService = {
  async register(payload) {
    const user = await User.create(payload);
    return sanitizeUser(user);
  },
  async login({ email, phone, password }) {
    const identifier = String(email || phone || "").trim();
    const query = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : { $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] };
    const user = await User.findOne(query).select("+password");
    if (!user || !(await user.comparePassword(password))) throw new AppError("Invalid credentials", 401);
    if (!user.isActive) throw new AppError("User account is inactive", 403);
    return issueTokens(user);
  },
  async loginWithPin({ pin }) {
    if (!/^\d{4,6}$/.test(String(pin || "").trim())) {
      throw new AppError("PIN must be 4 to 6 digits", 400);
    }

    const users = await User.find({ isActive: true, pin: { $exists: true, $ne: "" } }).select("+pin");
    for (const user of users) {
      if (await user.comparePin(pin)) {
        return issueTokens(user);
      }
    }

    throw new AppError("Invalid PIN", 401);
  },
  async refresh(refreshToken) {
    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findOne({ _id: decoded.id, "refreshTokens.token": refreshToken });
    if (!user || !user.isActive) throw new AppError("Invalid refresh token", 401);
    return { accessToken: signAccessToken(user) };
  },
  async logout(userId, refreshToken) {
    await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: { token: refreshToken } } });
  },
};
