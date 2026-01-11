import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all templates
  const templates = await prisma.template.findMany();
  
  console.log('Found templates:', templates.length);
  
  for (const template of templates) {
    // Check if businessName is already in the body
    if (!template.body.includes('{businessName}')) {
      // Add businessName line after Dear {clientName},
      let newBody = template.body;
      
      // Try to insert after the greeting
      if (newBody.includes('Dear {clientName},')) {
        newBody = newBody.replace(
          'Dear {clientName},',
          'Dear {clientName},\n\nThis invoice was issued by {businessName}.'
        );
      } else {
        // Prepend if no greeting found
        newBody = 'This invoice was issued by {businessName}.\n\n' + newBody;
      }
      
      await prisma.template.update({
        where: { id: template.id },
        data: { body: newBody }
      });
      
      console.log('Updated template:', template.name);
    } else {
      console.log('Already has businessName:', template.name);
    }
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
