import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../modules/auth/password.service';
import * as readline from 'readline';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const passwordService = app.get(PasswordService);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  console.log('=== Assetra Administrator Bootstrap ===');
  const name = await question('Full Name: ');
  const username = await question('Username: ');
  const email = await question('Email: ');
  const phone = await question('Phone (optional): ');
  const password = await question('Password: ');

  rl.close();

  if (!username || !password || !name) {
    console.error('Error: Name, username, and password are required.');
    await app.close();
    process.exit(1);
  }

  try {
    const passwordHash = await passwordService.hash(password);

    // Ensure Super Admin role exists
    let adminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'Super Admin' } });
    }

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email: email || null,
        phone: phone || null,
        passwordHash,
        status: 'active',
        userRoleAssignments: {
          create: {
            roleId: adminRole.id,
          },
        },
      },
    });

    console.log(`\nSuccessfully created Administrator: ${user.username} (ID: ${user.id})`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create admin user:', message);
  } finally {
    await app.close();
  }
}

void bootstrap();
