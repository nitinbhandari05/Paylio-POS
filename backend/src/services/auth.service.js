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

export const authService = {
  async register(payload) {
    const user = await User.create(payload);
    return user.toObject({ versionKey: false, transform: (_doc, ret) => delete ret.password });
  },
  async login({ email, password }) {
    const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) throw new AppError("Invalid credentials", 401);
    if (!user.isActive) throw new AppError("User account is inactive", 403);
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.lastLogin = new Date();
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshTokens;
    return { user: safeUser, accessToken, refreshToken };
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
