import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo user (optional - for testing)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@invoiceflow.com' },
    update: {},
    create: {
      email: 'demo@invoiceflow.com',
      passwordHash: await bcrypt.hash('demo123456', 10),
      name: 'Demo User',
      planStatus: 'FREE',
    },
  });

  console.log('✅ Demo user created:', demoUser.email, '(password: demo123456)');

  // Create default templates for demo user
  const templates = [
    {
      name: 'Friendly',
      subject: 'Friendly reminder: Invoice {invoiceNumber}',
      body: `Hi {clientName},

Just a quick reminder that invoice {invoiceNumber} for {amount} {currency} was due on {dueDate}.

Let me know if you need anything from me.

Thanks!`,
      isDefault: true,
    },
    {
      name: 'Neutral',
      subject: 'Payment reminder: Invoice {invoiceNumber}',
      body: `Hello {clientName},

This is a reminder that invoice {invoiceNumber} remains unpaid as of {dueDate}.

I'd appreciate your help in settling it at your earliest convenience.`,
      isDefault: true,
    },
    {
      name: 'Firm',
      subject: 'Overdue invoice: {invoiceNumber}',
      body: `Hi {clientName},

Invoice {invoiceNumber} is now overdue.

Please let me know when payment will be completed.`,
      isDefault: true,
    },
  ];

  const createdTemplates = [];

  // Check if templates already exist
  const existingTemplates = await prisma.template.findMany({
    where: {
      userId: demoUser.id,
      name: { in: templates.map(t => t.name) }
    },
  });

  if (existingTemplates.length > 0) {
    console.log('ℹ️  Templates already exist for demo user, skipping creation');
    createdTemplates.push(...existingTemplates);
  } else {
    // Create new templates
    for (const tpl of templates) {
      const template = await prisma.template.create({
        data: {
          ...tpl,
          userId: demoUser.id,
        },
      });
      createdTemplates.push(template);
      console.log('✅ Template created:', template.name);
    }
  }

  // Create default schedule for demo user
  const existingSchedule = await prisma.schedule.findFirst({
    where: { userId: demoUser.id, name: 'Default Schedule' },
  });

  if (!existingSchedule && createdTemplates.length >= 3) {
    const schedule = await prisma.schedule.create({
      data: {
        name: 'Default Schedule',
        userId: demoUser.id,
        isActive: true,
        steps: {
          create: [
            {
              templateId: createdTemplates[0].id,
              dayOffset: 0,
              order: 1,
            }, // Friendly on due date
            {
              templateId: createdTemplates[0].id,
              dayOffset: 3,
              order: 2,
            }, // Friendly +3 days
            {
              templateId: createdTemplates[1].id,
              dayOffset: 7,
              order: 3,
            }, // Neutral +7 days
            {
              templateId: createdTemplates[2].id,
              dayOffset: 14,
              order: 4,
            }, // Firm +14 days
          ],
        },
      },
      include: {
        steps: true,
      },
    });

    console.log('✅ Default schedule created with', schedule.steps.length, 'steps');
    console.log('   - Day 0: Friendly reminder (on due date)');
    console.log('   - Day 3: Friendly follow-up');
    console.log('   - Day 7: Neutral reminder');
    console.log('   - Day 14: Firm reminder');
  } else if (existingSchedule) {
    console.log('ℹ️  Default schedule already exists, skipping');
  } else {
    console.log('⚠️  Not enough templates to create schedule');
  }

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📝 You can now:');
  console.log('   1. Sign in with: demo@invoiceflow.com / demo123456');
  console.log('   2. Create a new account (templates/schedule auto-created on first use)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
