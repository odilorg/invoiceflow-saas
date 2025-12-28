#!/usr/bin/env node

/**
 * Migration script to ensure all existing users have a default schedule
 * Run: npx tsx scripts/migrate-default-schedules.ts
 */

import { PrismaClient } from '@prisma/client';
import { ensureDefaultSchedule } from '../lib/default-schedule';

const prisma = new PrismaClient();

async function migrateDefaultSchedules() {
  console.log('🚀 Starting default schedule migration...');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    console.log(`Found ${users.length} users to process`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`Processing user ${user.email}...`);

        // Check existing schedules
        const schedules = await prisma.schedule.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
        });

        const defaultSchedules = schedules.filter(s => s.isDefault);

        if (schedules.length === 0) {
          console.log(`  → No schedules found, creating default...`);
        } else if (defaultSchedules.length === 0) {
          console.log(`  → ${schedules.length} schedules found but no default, setting one...`);
        } else if (defaultSchedules.length > 1) {
          console.log(`  → Multiple defaults found, fixing...`);
        } else {
          console.log(`  → Already has default schedule, skipping`);
        }

        // Ensure default schedule (idempotent function)
        await ensureDefaultSchedule(user.id);

        successCount++;
        console.log(`  ✓ User processed successfully`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Error processing user ${user.email}:`, error);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✓ Successfully processed: ${successCount} users`);
    if (errorCount > 0) {
      console.log(`  ✗ Failed: ${errorCount} users`);
    }

    // Verification
    console.log('\n🔍 Verifying migration...');
    const usersWithoutDefault = await prisma.user.findMany({
      where: {
        schedules: {
          none: {
            isDefault: true,
          },
        },
      },
      select: { id: true, email: true },
    });

    if (usersWithoutDefault.length === 0) {
      console.log('✅ All users now have a default schedule!');
    } else {
      console.log(`⚠️  ${usersWithoutDefault.length} users still missing default schedule:`);
      usersWithoutDefault.forEach(u => console.log(`  - ${u.email}`));
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateDefaultSchedules().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});