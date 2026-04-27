import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),

  // Database
  mongodbUri: process.env.MONGODB_URI || process.env.MONGO_URI || "",
  mongoDbName: process.env.MONGO_DB_NAME || "emotion_learning",

  // Auth
  jwt: {
    secret: process.env.JWT_SECRET || "change-me-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    cookieExpiresInDays: toNumber(process.env.JWT_COOKIE_EXPIRES_DAYS, 7),
  },

  // Security / App
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
  trustProxy: toBool(process.env.TRUST_PROXY, false),

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "emotion-learning-admin",
  },
};

if (!env.mongodbUri) {
  console.warn(
    "⚠️ MONGODB_URI (or MONGO_URI) is not set. Startup can continue, but database connection will fail until it is provided.",
  );
}

if (!env.jwt.secret || env.jwt.secret === "change-me-in-production") {
  if (env.nodeEnv === "production") {
    throw new Error("Missing required secure JWT_SECRET in production");
  } else {
    console.warn("⚠️ Using fallback JWT_SECRET for development only.");
  }
}

if (env.bcryptSaltRounds < 8 || env.bcryptSaltRounds > 15) {
  console.warn(
    `⚠️ BCRYPT_SALT_ROUNDS (${env.bcryptSaltRounds}) is unusual. Recommended range is 10-12.`,
  );
}

export const isProduction = env.nodeEnv === "production";
export const isDevelopment = env.nodeEnv === "development";
export const isTest = env.nodeEnv === "test";

export default env;
