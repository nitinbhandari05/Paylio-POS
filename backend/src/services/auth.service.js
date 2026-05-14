import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User from "../models/user.model.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id, tokenId: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

const sanitizeUser = (user) => {
  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.pin;
  delete safeUser.refreshTokens;
  return safeUser;
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
  const updated = await User.update(user._id, {
    lastLogin: new Date().toISOString(),
    refreshTokens: [
      ...refreshTokens,
      {
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
  return { user: sanitizeUser(updated || user), accessToken, refreshToken };
};

export const authService = {
  async register(payload) {
    const user = await User.create(payload);
    return sanitizeUser(user);
  },
  async login({ email, phone, password }) {
    const identifier = String(email || phone || "").trim();
    const user = identifier.includes("@")
      ? await User.findOne({ email: identifier.toLowerCase() })
      : (await User.findOne({ phone: identifier })) ||
        (await User.findOne({ email: identifier.toLowerCase() }));
    if (!user || user.password !== password) throw new AppError("Invalid credentials", 401);
    if (user.active === false || user.isActive === false) throw new AppError("User account is inactive", 403);
    return issueTokens(user);
  },
  async loginWithPin({ pin }) {
    if (!/^\d{4,6}$/.test(String(pin || "").trim())) {
      throw new AppError("PIN must be 4 to 6 digits", 400);
    }

    const users = await User.list();
    for (const user of users.filter((item) => item.active !== false && item.isActive !== false && item.pin)) {
      if (String(user.pin) === String(pin)) {
        return issueTokens(user);
      }
    }

    throw new AppError("Invalid PIN", 401);
  },
  async refresh(refreshToken) {
    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findOne({ _id: decoded.id });
    const hasRefreshToken = (user?.refreshTokens || []).some((item) => item.token === refreshToken);
    if (!user || user.active === false || user.isActive === false || !hasRefreshToken) {
      throw new AppError("Invalid refresh token", 401);
    }
    return { accessToken: signAccessToken(user) };
  },
  async logout(userId, refreshToken) {
    await User.removeRefreshToken(userId, refreshToken);
  },
};
