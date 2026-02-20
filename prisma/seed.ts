import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import { genSalt, hash } from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.ADMIN_LAST_NAME ?? 'Admin';

  if (!email || !password) {
    console.error(
      '❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env to seed the admin user.',
    );
    process.exit(1);
  }

  // Ensure only one ADMIN can ever exist
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (existingAdmin) {
    console.log(
      `✅ Admin already exists (${existingAdmin.email}). Skipping seed.`,
    );
    return;
  }

  const salt = (await genSalt()) as string;
  const passwordHash = (await hash(password, salt)) as string;

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: Role.ADMIN,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`✅ Admin user seeded: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
