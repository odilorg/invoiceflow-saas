/**
 * Script to initialize default schedules for all existing users
 * Run with: npx tsx scripts/initialize-default-schedules.ts
 */

import { PrismaClient } from '@prisma/client';
import { ensureDefaultSchedule } from '../lib/default-schedule';

const prisma = new PrismaClient();

async function initializeDefaultSchedules() {
  console.log('🚀 Starting default schedule initialization...');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        schedules: {
          select: {
            id: true,
            isDefault: true,
          },
        },
      },
    });

    console.log(`Found ${users.length} users to process`);

    let created = 0;
    let skipped = 0;
    let fixed = 0;

    for (const user of users) {
      const defaultSchedules = user.schedules.filter(s => s.isDefault);

      if (defaultSchedules.length === 0) {
        // No default schedule, create one
        console.log(`Creating default schedule for user: ${user.email}`);
        await ensureDefaultSchedule(user.id);
        created++;
      } else if (defaultSchedules.length > 1) {
        // Multiple defaults, fix it
        console.log(`Fixing multiple defaults for user: ${user.email}`);
        await ensureDefaultSchedule(user.id);
        fixed++;
      } else {
        // Already has exactly one default
        skipped++;
      }
    }

    console.log('\n✅ Initialization complete!');
    console.log(`  - Created: ${created} default schedules`);
    console.log(`  - Fixed: ${fixed} users with multiple defaults`);
    console.log(`  - Skipped: ${skipped} users with correct defaults`);

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
initializeDefaultSchedules();