import "dotenv/config";

export const config = {
  env: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "0.0.0.0",
  },

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },

  payfast: {
    merchantId: process.env.PAYFAST_MERCHANT_ID!,
    merchantKey: process.env.PAYFAST_MERCHANT_KEY!,
    passphrase: process.env.PAYFAST_PASSPHRASE || "",
    sandbox: process.env.PAYFAST_SANDBOX === "true",
    validateUrl: process.env.PAYFAST_SANDBOX === "true"
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate",
  },

  email: {
    from: process.env.EMAIL_FROM || "noreply@lms.local",
  },
} as const;

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}