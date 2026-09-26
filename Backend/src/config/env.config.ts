import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env file
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce
    .number()
    .default(5000),

  // MySQL
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().default(3306),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().default('acs_customer_service'),
  MYSQL_CONNECTION_LIMIT: z.coerce.number().default(10),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET must be at least 16 characters"),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default("15m"),

  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .default("7d"),

  // AWS S3
  AWS_REGION: z
    .string()
    .default("ap-south-1"),

  AWS_S3_BUCKET_NAME: z
    .string()
    .min(1, "AWS_S3_BUCKET_NAME is required"),

  S3_SIGNED_URL_EXPIRES_IN: z.coerce
    .number()
    .default(300),

  // Frontend
  FRONTEND_URL: z
    .string()
    .default("https://acs-customer-service-centre-1.vercel.app"),

  // Cookies
  COOKIE_SECRET: z
    .string()
    .min(16, "COOKIE_SECRET must be at least 16 characters"),

  // File upload
  MAX_FILE_SIZE_MB: z.coerce
    .number()
    .default(25),

  // Logging
  LOG_LEVEL: z
    .enum([
      "error",
      "warn",
      "info",
      "http",
      "verbose",
      "debug",
      "silly",
    ])
    .default("info"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables configuration:");
  console.error(
    JSON.stringify(parsedEnv.error.format(), null, 2)
  );

  process.exit(1);
}

export const env = parsedEnv.data;

export type EnvConfig = typeof env;