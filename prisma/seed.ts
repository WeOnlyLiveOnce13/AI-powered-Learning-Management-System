import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "postgresql://lms_user:lms_password@localhost:5432/lms_db";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(" ======== Seeding database...=========\n");

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "john.doe@example.com" },
    update: {},
    create: {
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
    },
  });
  console.log("SUCCESS --- User created:", user.email);

  // Create test courses
  const course1 = await prisma.course.upsert({
    where: { id: "course-typescript-101" },
    update: {},
    create: {
      id: "course-typescript-101",
      title: "TypeScript Fundamentals",
      description: "Learn TypeScript from scratch",
      price: 499.99,
      isActive: true,
    },
  });
  console.log("SUCCESS --- Course created:", course1.title);

  const course2 = await prisma.course.upsert({
    where: { id: "course-nodejs-advanced" },
    update: {},
    create: {
      id: "course-nodejs-advanced",
      title: "Advanced Node.js",
      description: "Master Node.js and backend development",
      price: 799.99,
      isActive: true,
    },
  });
  console.log("SUCCESS --- Course created:", course2.title);

  // Create test invoice
  const invoiceNumber = `INV-${Date.now()}`;
  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber },
    update: {},
    create: {
      invoiceNumber,
      userId: user.id,
      status: "PENDING",
      subtotal: 499.99,
      tax: 75.00,
      total: 574.99,
      items: {
        create: [
          {
            courseId: course1.id,
            description: course1.title,
            quantity: 1,
            unitPrice: 499.99,
            total: 499.99,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });
  console.log("SUCCESS --- Invoice created:", invoice.invoiceNumber);

  // Create a payment record (pending)
  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: invoice.total,
      status: "PENDING",
      paymentMethod: "payfast",
    },
  });
  console.log("SUCCESS --- Payment created:", payment.id);

  // Summary
  console.log("\n =======   Seed Summary:===============================");
  console.log("─".repeat(50));
  console.log(`User ID:        ${user.id}`);
  console.log(`User Email:     ${user.email}`);
  console.log(`Course ID:      ${course1.id}`);
  console.log(`Invoice ID:     ${invoice.id}`);
  console.log(`Invoice Number: ${invoice.invoiceNumber}`);
  console.log(`Payment ID:     ${payment.id}`);
  console.log(`Amount:         R ${invoice.total}`);
  console.log("─".repeat(50));
  console.log("\n ````` Use these IDs in the PayFast simulator!\n");
}

main()
  .catch((e) => {
    console.error("FAILURE!!!--- Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });