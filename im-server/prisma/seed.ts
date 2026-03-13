import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"],
});
const prisma = new PrismaClient({ adapter });

const SEED_ACCOUNTS = [
  {
    name: "Admin",
    email: "admin@clawchat.com",
    password: "admin123456",
  },
  {
    name: "Tester",
    email: "test@clawchat.com",
    password: "test123456",
  },
];

async function main() {
  for (const { name, email, password } of SEED_ACCOUNTS) {
    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      console.log(`  skip: ${email} (already exists)`);
      continue;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.account.create({
      data: { type: "human", name, email, passwordHash },
    });
    console.log(`  created: ${email}`);
  }
}

main()
  .then(() => {
    console.log("Seed done.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
