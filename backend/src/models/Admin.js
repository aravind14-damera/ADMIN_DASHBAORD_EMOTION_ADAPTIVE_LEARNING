import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import env from "../config/env.js";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      immutable: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

adminSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();

  const saltRounds = env.bcryptSaltRounds || 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

adminSchema.methods.comparePassword = async function comparePassword(
  candidatePassword,
) {
  if (!candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.toSafeObject = function toSafeObject() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt,
  };
};

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);

export default Admin;
