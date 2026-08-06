import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_SESSIONS = [
  { name: 'Pagi', code: 'MORNING', startTime: '06:00', endTime: '11:00', sortOrder: 1 },
  { name: 'Siang', code: 'NOON', startTime: '11:00', endTime: '15:00', sortOrder: 2 },
  { name: 'Sore', code: 'EVENING', startTime: '15:00', endTime: '18:00', sortOrder: 3 },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== Seeding Checklist Sessions ===');

  for (const session of DEFAULT_SESSIONS) {
    await prisma.checklistSession.upsert({
      where: { code: session.code },
      update: {},
      create: session,
    });
  }

  console.log(`✅ Seeded ${DEFAULT_SESSIONS.length} default sessions`);

  console.log('✅ Seeding completed');
  await app.close();
}

bootstrap().catch(async (e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});