import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const company = await prisma.company.upsert({where:{id:'00000000-0000-0000-0000-000000000001'},update:{},create:{id:'00000000-0000-0000-0000-000000000001',nameAr:'شركة تجريبية',nameEn:'Demo Company'}});
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.upsert({where:{companyId_email:{companyId:company.id,email:'admin@example.com'}},update:{passwordHash},create:{companyId:company.id,email:'admin@example.com',passwordHash,role:Role.COMPANY_ADMIN}});
}
main().finally(()=>prisma.$disconnect());
