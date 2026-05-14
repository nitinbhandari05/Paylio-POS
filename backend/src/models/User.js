import mongoose from "mongoose";
import bcrypt from "bcrypt";

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    pin: { type: String, select: false },
    role: { type: String, enum: ["admin", "manager", "cashier"], default: "cashier", index: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLogin: Date,
    refreshTokens: [refreshTokenSchema],
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashCredentials(next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified("pin") && this.pin) {
    this.pin = await bcrypt.hash(String(this.pin), 12);
  }
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.comparePin = function comparePin(pin) {
  if (!this.pin) return false;
  return bcrypt.compare(String(pin), this.pin);
};

export default mongoose.models.User || mongoose.model("User", userSchema);
