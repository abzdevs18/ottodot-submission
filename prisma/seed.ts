// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create badges
  const badges = [
    {
      name: 'Streak Master',
      badgeType: 'STREAK_MASTER',
      description: 'Earned by solving 5 problems correctly in a row!',
      iconUrl: '🔥',
    },
    {
      name: 'Persistence',
      badgeType: 'PERSISTENCE',
      description: 'Earned by completing 10 problems!',
      iconUrl: '💪',
    },
    {
      name: 'Perfectionist',
      badgeType: 'PERFECTIONIST',
      description: 'Earned by solving 10 problems with 100% accuracy!',
      iconUrl: '⭐',
    },
    {
      name: 'Quick Solver',
      badgeType: 'QUICK_SOLVER',
      description: 'Earned by solving 5 problems in under 10 minutes!',
      iconUrl: '⚡',
    },
    {
      name: 'Math Genius',
      badgeType: 'MATH_GENIUS',
      description: 'Earned by solving 50 problems total!',
      iconUrl: '🎓',
    },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: {},
      create: badge as any,
    })
  }

  console.log('✅ Badges created')

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  // Create teacher users
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher1@test.com' },
    update: {},
    create: {
      email: 'teacher1@test.com',
      password: hashedPassword,
      name: 'Ms. Sarah Johnson',
      role: 'TEACHER',
    },
  })

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@test.com' },
    update: {},
    create: {
      email: 'teacher2@test.com',
      password: hashedPassword,
      name: 'Mr. David Lee',
      role: 'TEACHER',
    },
  })

  // Create student users
  const students = [
    { email: 'student1@test.com', name: 'Alice Wong' },
    { email: 'student2@test.com', name: 'Bob Chen' },
    { email: 'student3@test.com', name: 'Charlie Tan' },
    { email: 'student4@test.com', name: 'Diana Lim' },
    { email: 'student5@test.com', name: 'Ethan Ng' },
  ]

  for (const student of students) {
    await prisma.user.upsert({
      where: { email: student.email },
      update: {},
      create: {
        email: student.email,
        password: hashedPassword,
        name: student.name,
        role: 'STUDENT',
      },
    })
  }

  console.log('✅ Test users created')
  console.log('\n📝 Test Credentials:')
  console.log('Admin: admin@test.com / password123')
  console.log('Teacher: teacher1@test.com / password123')
  console.log('Teacher: teacher2@test.com / password123')
  console.log('Students: student1@test.com to student5@test.com / password123')
  console.log('\n🌱 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
