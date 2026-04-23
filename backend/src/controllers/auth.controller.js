import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Organization from "../models/organization.model.js";
import OtpToken from "../models/otp-token.model.js";
import { normalizeRole as normalizeRoleFromConfig, ROLES } from "../config/rbac.config.js";

const getJwtSecret = () => process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET;
const getJwtExpiry = () => process.env.ACCESS_TOKEN_EXPIRY || "1d";
const normalizeRole = (role) => normalizeRoleFromConfig(role);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePhone = (value) => String(value || "").trim();

const ALL_ROLES = new Set([...ROLES, "admin", "owner", "kitchen", "delivery", "headoffice", "user"]);

const PRIVILEGED_TARGET_ROLES = new Set([
  "brandowner",
  "franchiseowner",
  "outletowner",
  "manager",
  "superadmin",
  "admin",
  "owner",
  "headoffice",
]);

const PRIVILEGED_CREATOR_ROLES = new Set([
  "brandowner",
  "franchiseowner",
  "outletowner",
  "superadmin",
  "admin",
  "owner",
  "headoffice",
]);

const PUBLIC_REGISTER_ROLES = new Set([
  "user",
  "cashier",
  "waiter",
  "kitchen",
  "chef",
  "deliverystaff",
  "accountant",
]);

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : user;
  const { password, ...safeUser } = plainUser;
  return safeUser;
};

const maskTarget = (channel, target) => {
  const value = String(target || "");
  if (channel === "email") {
    const [name = "", domain = ""] = value.split("@");
    const prefix = name.slice(0, 2);
    return `${prefix}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
  }
  const tail = value.slice(-4);
  return `${"*".repeat(Math.max(0, value.length - 4))}${tail}`;
};

const getOtpDebugPayload = (otp) => {
  const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  if (isProduction) return {};
  return { debugOtp: otp.code };
};

const getActorFromToken = (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;
  if (!token) return null;

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) return null;

  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
};

// REGISTER
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      pin,
      role,
      outletId,
      organizationId,
      accessibleOutletIds,
      isHeadOffice,
      otpChannel,
      otpCode,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!name || !password || (!normalizedEmail && !normalizedPhone)) {
      return res.status(400).json({ message: "name, password, and email/phone are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const pinValue = String(pin || "").trim();
    if (pinValue && !/^\d{4,6}$/.test(pinValue)) {
      return res.status(400).json({ message: "PIN must be 4 to 6 digits" });
    }

    const requestedRole = normalizeRole(role || "cashier");
    if (!ALL_ROLES.has(requestedRole)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const actor = getActorFromToken(req);
    const actorRole = normalizeRole(actor?.role);
    const isActorPrivileged = PRIVILEGED_CREATOR_ROLES.has(actorRole);

    const isPrivilegedTargetRole = PRIVILEGED_TARGET_ROLES.has(requestedRole);
    if (isPrivilegedTargetRole && !isActorPrivileged) {
      return res.status(403).json({
        message: "Only admin-level users can create privileged roles",
      });
    }

    if (!isPrivilegedTargetRole && !isActorPrivileged && !PUBLIC_REGISTER_ROLES.has(requestedRole)) {
      return res.status(403).json({ message: "Role not allowed for public registration" });
    }

    if (normalizedPhone && !/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: "Phone must be 10 to 15 digits" });
    }

    const channel = String(otpChannel || (normalizedPhone ? "phone" : "email")).trim().toLowerCase();
    const target = channel === "phone" ? normalizedPhone : normalizedEmail;
    if (!otpCode) {
      return res.status(400).json({ message: "OTP code is required for registration" });
    }
    await OtpToken.verify({
      purpose: "register",
      channel,
      target,
      code: otpCode,
    });

    const existingUserByEmail = normalizedEmail
      ? await User.findOne({ email: normalizedEmail })
      : null;
    if (existingUserByEmail) {
      return res.status(400).json({ message: "User already exists" });
    }

    const existingUserByPhone = normalizedPhone
      ? await User.findOne({ phone: normalizedPhone })
      : null;
    if (existingUserByPhone) {
      return res.status(400).json({ message: "Phone already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      pin: pinValue,
      role: requestedRole,
      outletId: outletId || process.env.DEFAULT_OUTLET_ID || "main",
      organizationId: organizationId || Organization.DEFAULT_ORG_ID,
      accessibleOutletIds: Array.isArray(accessibleOutletIds)
        ? accessibleOutletIds
        : [outletId || process.env.DEFAULT_OUTLET_ID || "main"],
      isHeadOffice: Boolean(isHeadOffice && isActorPrivileged),
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
    const { email, phone, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if ((!normalizedEmail && !normalizedPhone) || !password) {
      return res.status(400).json({ message: "email/phone and password are required" });
    }

    const user = normalizedEmail
      ? await User.findOne({ email: normalizedEmail })
      : await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (user.active === false) {
      return res.status(403).json({ message: "User is inactive. Contact admin." });
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
        organizationId: user.organizationId || Organization.DEFAULT_ORG_ID,
        accessibleOutletIds:
          user.accessibleOutletIds ||
          [user.outletId || process.env.DEFAULT_OUTLET_ID || "main"],
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
    if (user.active === false) {
      return res.status(403).json({ message: "User is inactive. Contact admin." });
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
        organizationId: user.organizationId || Organization.DEFAULT_ORG_ID,
        accessibleOutletIds:
          user.accessibleOutletIds ||
          [user.outletId || process.env.DEFAULT_OUTLET_ID || "main"],
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

export const requestRegisterOtp = async (req, res) => {
  try {
    const channel = String(req.body.channel || "").trim().toLowerCase();
    const target =
      channel === "phone"
        ? normalizePhone(req.body.phone || req.body.target)
        : normalizeEmail(req.body.email || req.body.target);

    if (!["email", "phone"].includes(channel)) {
      return res.status(400).json({ message: "OTP channel must be email or phone" });
    }
    if (!target) {
      return res.status(400).json({ message: "Email/phone is required" });
    }
    if (channel === "phone" && !/^\+?[0-9]{10,15}$/.test(target)) {
      return res.status(400).json({ message: "Phone must be 10 to 15 digits" });
    }

    const existing =
      channel === "phone"
        ? await User.findOne({ phone: target })
        : await User.findOne({ email: target });
    if (existing) {
      return res.status(400).json({ message: "User already exists for this contact" });
    }

    const otp = await OtpToken.request({
      purpose: "register",
      channel,
      target,
    });

    console.log(`[OTP][register][${channel}] ${target}: ${otp.code}`);
    res.json({
      message: `OTP sent to ${maskTarget(channel, target)}`,
      channel,
      target: maskTarget(channel, target),
      ...getOtpDebugPayload(otp),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const requestForgotPasswordOtp = async (req, res) => {
  try {
    const channel = String(req.body.channel || "").trim().toLowerCase();
    const target =
      channel === "phone"
        ? normalizePhone(req.body.phone || req.body.target)
        : normalizeEmail(req.body.email || req.body.target);

    if (!["email", "phone"].includes(channel)) {
      return res.status(400).json({ message: "OTP channel must be email or phone" });
    }
    if (!target) {
      return res.status(400).json({ message: "Email/phone is required" });
    }
    if (channel === "phone" && !/^\+?[0-9]{10,15}$/.test(target)) {
      return res.status(400).json({ message: "Phone must be 10 to 15 digits" });
    }

    const user =
      channel === "phone"
        ? await User.findOne({ phone: target })
        : await User.findOne({ email: target });
    if (!user) {
      return res.status(404).json({ message: "User not found for this contact" });
    }

    const otp = await OtpToken.request({
      purpose: "forgot_password",
      channel,
      target,
    });

    console.log(`[OTP][forgot_password][${channel}] ${target}: ${otp.code}`);
    res.json({
      message: `OTP sent to ${maskTarget(channel, target)}`,
      channel,
      target: maskTarget(channel, target),
      ...getOtpDebugPayload(otp),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const channel = String(req.body.channel || "").trim().toLowerCase();
    const target =
      channel === "phone"
        ? normalizePhone(req.body.phone || req.body.target)
        : normalizeEmail(req.body.email || req.body.target);
    const otpCode = String(req.body.otpCode || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!["email", "phone"].includes(channel)) {
      return res.status(400).json({ message: "OTP channel must be email or phone" });
    }
    if (!target || !otpCode || !newPassword) {
      return res.status(400).json({ message: "channel, target, otpCode, and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    await OtpToken.verify({
      purpose: "forgot_password",
      channel,
      target,
      code: otpCode,
    });

    const user =
      channel === "phone"
        ? await User.findOne({ phone: target })
        : await User.findOne({ email: target });
    if (!user) {
      return res.status(404).json({ message: "User not found for this contact" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await User.update(user._id, { password: hashedPassword });
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
