import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('Demo1234!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@familytree.com' },
    update: {},
    create: {
      email: 'demo@familytree.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  });

  console.log('Created user:', user.email);

  // Create demo family tree
  const tree = await prisma.familyTree.upsert({
    where: { id: 'demo-tree-id' },
    update: {},
    create: {
      id: 'demo-tree-id',
      name: 'Demo Family Tree',
      description: 'A sample family tree for demonstration purposes',
      isPublic: true,
      userId: user.id,
    },
  });

  console.log('Created tree:', tree.name);

  // Create demo family members
  const grandfather = await prisma.familyMember.upsert({
    where: { id: 'demo-grandfather' },
    update: {},
    create: {
      id: 'demo-grandfather',
      firstName: 'John',
      lastName: 'Smith',
      birthYear: 1940,
      deathYear: 2020,
      birthPlace: 'New York, USA',
      occupation: 'Engineer',
      relationship: 'grandfather',
      gender: 'male',
      generation: 0,
      familyTreeId: tree.id,
    },
  });

  const grandmother = await prisma.familyMember.upsert({
    where: { id: 'demo-grandmother' },
    update: {},
    create: {
      id: 'demo-grandmother',
      firstName: 'Mary',
      lastName: 'Smith',
      birthYear: 1943,
      birthPlace: 'Boston, USA',
      occupation: 'Teacher',
      relationship: 'grandmother',
      gender: 'female',
      generation: 0,
      familyTreeId: tree.id,
    },
  });

  const father = await prisma.familyMember.upsert({
    where: { id: 'demo-father' },
    update: {},
    create: {
      id: 'demo-father',
      firstName: 'Robert',
      lastName: 'Smith',
      birthYear: 1965,
      birthPlace: 'New York, USA',
      occupation: 'Doctor',
      relationship: 'father',
      gender: 'male',
      generation: 1,
      parentId: grandfather.id,
      secondParentId: grandmother.id,
      familyTreeId: tree.id,
    },
  });

  const mother = await prisma.familyMember.upsert({
    where: { id: 'demo-mother' },
    update: {},
    create: {
      id: 'demo-mother',
      firstName: 'Sarah',
      lastName: 'Smith',
      birthYear: 1968,
      birthPlace: 'Chicago, USA',
      occupation: 'Lawyer',
      relationship: 'mother',
      gender: 'female',
      generation: 1,
      familyTreeId: tree.id,
    },
  });

  await prisma.familyMember.upsert({
    where: { id: 'demo-self' },
    update: {},
    create: {
      id: 'demo-self',
      firstName: 'James',
      lastName: 'Smith',
      birthYear: 1995,
      birthPlace: 'Los Angeles, USA',
      occupation: 'Software Engineer',
      relationship: 'son',
      gender: 'male',
      generation: 2,
      parentId: father.id,
      secondParentId: mother.id,
      familyTreeId: tree.id,
    },
  });

  console.log('Created family members');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
