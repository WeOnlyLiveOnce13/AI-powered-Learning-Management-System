import crypto from "crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Debug: Check if env vars are loaded
console.log("DEBUG ---> Loading .env from:", path.resolve(__dirname, "..", ".env"));
console.log("DEBUG ---> PAYFAST_MERCHANT_ID:", process.env.PAYFAST_MERCHANT_ID);

// Configuration - UPDATE THESE VALUES after running seed
const CONFIG = {
  // From your .env file
  merchantId: process.env.PAYFAST_MERCHANT_ID ?? "",
  merchantKey: process.env.PAYFAST_MERCHANT_KEY ?? "",
  passphrase: process.env.PAYFAST_PASSPHRASE ?? "",
  
  // From seed output - UPDATE THESE!
  userId: process.env.TEST_USER_ID ?? "YOUR_USER_ID_HERE",
  invoiceId: process.env.TEST_INVOICE_ID ?? "YOUR_INVOICE_ID_HERE",
  paymentId: process.env.TEST_PAYMENT_ID ?? "YOUR_PAYMENT_ID_HERE",
  
  // Payment details
  amount: "574.99",
  itemName: "TypeScript Fundamentals",
  
  // Webhook URL
  webhookUrl: process.env.WEBHOOK_URL ?? "http://localhost:3000/api/v1/webhooks/payfast",
};

interface PayFastPayload {
  merchant_id: string;
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1: string;
  custom_str2: string;
  name_first: string;
  name_last: string;
  email_address: string;
  signature?: string;
}

// Validate required config
if (!CONFIG.merchantId || !CONFIG.merchantKey) {
  console.error("FAILURE ---> Missing required environment variables:");
  console.error("   PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY must be set in .env");
  process.exit(1);
}

interface PayFastPayload {
  merchant_id: string;
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1: string;
  custom_str2: string;
  name_first: string;
  name_last: string;
  email_address: string;
  signature?: string;
}

function generateSignature(data: PayFastPayload, passphrase: string): string {
  // Sort keys alphabetically
  const sortedKeys = Object.keys(data).sort() as (keyof PayFastPayload)[];
  
  // Build parameter string
  const paramString = sortedKeys
    .filter((key) => key !== "signature" && data[key] !== undefined && data[key] !== "")
    .map((key) => `${key}=${encodeURIComponent(data[key]!).replace(/%20/g, "+")}`)
    .join("&");

  // Add passphrase
  const stringToHash = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`
    : paramString;

  console.log("\n ACTION ---> String to hash:");
  console.log(stringToHash);

  // Generate MD5 hash
  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

async function simulatePayFastWebhook(status: "COMPLETE" | "FAILED" | "CANCELLED" = "COMPLETE") {
  console.log(" REACHED ---> PayFast Webhook Simulator\n");
  console.log("─".repeat(50));

  // Generate unique PayFast payment ID
  const pfPaymentId = `PF${Date.now()}`;

  // Build payload
  const payload: PayFastPayload = {
    merchant_id: CONFIG.merchantId,
    m_payment_id: CONFIG.paymentId,
    pf_payment_id: pfPaymentId,
    payment_status: status,
    item_name: CONFIG.itemName,
    amount_gross: CONFIG.amount,
    amount_fee: "13.22",
    amount_net: (parseFloat(CONFIG.amount) - 13.22).toFixed(2),
    custom_str1: CONFIG.userId,      // userId
    custom_str2: CONFIG.invoiceId,   // invoiceId
    name_first: "John",
    name_last: "Doe",
    email_address: "john.doe@example.com",
  };

  // Generate signature
  const signature = generateSignature(payload, CONFIG.passphrase);
  payload.signature = signature;

  console.log("\n DATA --- Payload:");
  console.log(JSON.stringify(payload, null, 2));
  console.log("\n DATA --- Generated Signature:", signature);
  console.log("─".repeat(50));

  // Send webhook
  console.log("\n ACTION --- Sending webhook to:", CONFIG.webhookUrl);

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(payload as unknown as Record<string, string>).toString(),
    });

    const responseText = await response.text();
    
    console.log("\n RESPONSE --- Response:");
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Body: ${responseText}`);
    console.log("─".repeat(50));

    if (response.ok) {
      console.log("\nSUCCESS ---> Webhook sent successfully!");
      console.log("\n SUMMARY ---> Next steps:");
      console.log("   1. Check your server logs for processing details");
      console.log("   2. Verify invoice status changed to PAID");
      console.log("   3. Verify enrollment was created/activated");
      console.log("\n RECOMMENDATIONS ---> Run these commands to verify:");
      console.log("   npx prisma studio");
    } else {
      console.log("\nFAILURE ---> Webhook failed!");
    }
  } catch (error) {
    console.error("\nFAILURE ---> Error sending webhook:", error);
  }
}

// Get status from command line args
const status = (process.argv[2]?.toUpperCase() as "COMPLETE" | "FAILED" | "CANCELLED") ?? "COMPLETE";

if (!["COMPLETE", "FAILED", "CANCELLED"].includes(status)) {
  console.log("Usage: tsx scripts/simulate-payfast.ts [COMPLETE|FAILED|CANCELLED]");
  process.exit(1);
}

simulatePayFastWebhook(status);