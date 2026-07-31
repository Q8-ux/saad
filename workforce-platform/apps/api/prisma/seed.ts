import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!initialAdminPassword) {
    console.log('INITIAL_ADMIN_PASSWORD is not set; skipping initial administrator creation.');
    return;
  }

  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nameAr: 'شركة تجريبية',
      nameEn: 'Demo Company',
    },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: {
      companyId_email: {
        companyId: company.id,
        email: 'admin@example.com',
      },
    },
  });

  if (existingAdmin) {
    console.log('Initial administrator already exists; password was not changed.');
    return;
  }

  const passwordHash = await bcrypt.hash(initialAdminPassword, 12);

  await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@example.com',
      passwordHash,
      role: Role.COMPANY_ADMIN,
    },
  });

  console.log('Initial administrator created.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
