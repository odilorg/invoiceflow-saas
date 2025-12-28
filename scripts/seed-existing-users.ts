import { prisma } from '../lib/db';
import { seedDefaultTemplatesAndSchedule } from '../lib/seed-defaults';

async function main() {
  console.log('🌱 Seeding default templates and schedules for existing users...\n');

  // Get all users without templates
  const users = await prisma.user.findMany({
    include: {
      templates: true,
    },
  });

  let seeded = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.templates.length === 0) {
      console.log(`📧 Seeding defaults for user: ${user.email} (${user.id})`);
      try {
        await seedDefaultTemplatesAndSchedule(user.id);
        seeded++;
        console.log(`  ✅ Successfully seeded defaults\n`);
      } catch (error) {
        console.error(`  ❌ Failed to seed for ${user.email}:`, error);
      }
    } else {
      console.log(`⏭️  Skipping ${user.email} (already has ${user.templates.length} templates)`);
      skipped++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Total users: ${users.length}`);
  console.log(`  Seeded: ${seeded}`);
  console.log(`  Skipped: ${skipped}`);
  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
