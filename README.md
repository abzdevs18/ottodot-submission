# Math Problem Generator - AI-Powered LMS Platform

## 🎯 Overview

A production-ready, AI-powered math problem generator platform with real-time updates, adaptive difficulty, gamification, and role-based dashboards. Built as a comprehensive Learning Management System (LMS) for Primary 5 mathematics education.

**Key Highlights:**
- ✅ **AI-Powered**: Uses Claude AI (Anthropic) for personalized problem generation and feedback
- ✅ **Real-time**: WebSocket-based instant updates for problems and feedback
- ✅ **Scalable**: Asynchronous job processing with BullMQ + Redis
- ✅ **Adaptive**: Automatically adjusts difficulty based on student performance
- ✅ **Gamified**: Badge system and streak tracking for engagement
- ✅ **Responsive**: Modern ChatGPT-inspired UI, mobile-first design
- ✅ **Multi-Role**: Separate dashboards for Students, Teachers, and Admins

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: Socket.IO Client
- **Icons**: Inline SVG Icons

### Backend
- **Runtime**: Node.js with Custom Express Server
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Queue System**: BullMQ + Redis
- **Real-time**: Socket.IO Server
- **AI Integration**: Anthropic Claude API (Claude 3.5 Sonnet)
- **Authentication**: JWT + bcrypt

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Redis** (local or cloud - Redis Cloud recommended)
- **Claude API Key** from Anthropic
- **PostgreSQL** database (Supabase credentials provided)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ottodot-coding-task-full-stack-main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

The `.env` file already contains database and Redis credentials. **All services are pre-configured and ready to use.**

**Required Environment Variables (already set):**

```env
# Database (Supabase - Pre-configured)
DATABASE_URL="postgresql://postgres.xxx@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Anthropic Claude API (Pre-configured)
CLAUDE_API_KEY=sk-ant-api03-xxx

# Redis Cloud (Pre-configured)
REDIS_HOST=redis-18005.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com
REDIS_PORT=18005
REDIS_PASSWORD=xxx

# JWT Secret (Pre-configured)
JWT_SECRET=xxx

# Socket.IO (Optional - defaults to http://localhost:3011)
# NEXT_PUBLIC_SOCKET_URL=http://localhost:3011
# For production, set to your socket server URL:
# NEXT_PUBLIC_SOCKET_URL=https://socket.academicwebsolution.com
```

**Get Your Own Claude API Key (Optional):**
1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys section
3. Create a new API key for Claude 3.5 Sonnet
4. Replace `CLAUDE_API_KEY` in `.env`

**Alternative Redis Setup (Optional):**
- **Local**: Install Redis locally with `brew install redis` (Mac) or from [redis.io](https://redis.io/download)
- **Cloud**: Use [Redis Cloud](https://redis.com/try-free/) (30 connections free tier)

### 4. Initialize Database

```bash
# Push schema to database
npm run prisma:push

# Generate Prisma Client
npm run prisma:generate

# Seed the database with test users and badges
npm run seed
```

### 5. Start Redis Server

```bash
# If using local Redis
redis-server
```

### 6. Run the Application

**Option A: Run everything separately**
```bash
# Terminal 1: Start Next.js server with Socket.IO
npm run dev

# Terminal 2: Start BullMQ worker
npm run worker
```

**Option B: Run everything together**
```bash
npm run dev:all
```

### 7. Access the Application

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Test Credentials:**
- **Student**: `student1@test.com` / `password123`
- **Teacher**: `teacher1@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`

## ✨ Features

### 👨‍🎓 Student Dashboard
- **AI Problem Generation**: Generate contextual math problems using Gemini Pro
- **Adaptive Difficulty**: System automatically adjusts difficulty based on performance (last 5 problems)
- **Instant Feedback**: AI-generated personalized feedback for each submission
- **Progress Tracking**: View total problems, accuracy rate, and current streak
- **Gamification**: Earn badges for achievements (Streak Master, Persistence, Math Genius, etc.)
- **Real-time Updates**: Problems and feedback generated asynchronously with live updates

### 👨‍🏫 Teacher Dashboard
- **Student Overview**: View all students with their progress and performance metrics
- **Real-time Activity Feed**: Live updates when students generate problems or submit answers
- **Analytics Dashboard**: 
  - Overall accuracy across all students
  - Difficulty distribution
  - Recent activity (24-hour stats)
  - Top performers leaderboard
  - Average solve times
- **Student Details**: Individual student progress, badges, and recent sessions

### 👨‍💼 Admin Dashboard
- **BullMQ Queue Monitoring**: Real-time view of job queues
  - Problem generation queue
  - Feedback generation queue
  - Job status: waiting, active, completed, failed, delayed
- **System Health**: Monitor queue backlogs and failed jobs
- **Auto-refresh**: Automatic updates every 5 seconds
- **System Information**: Overview of tech stack and configuration

## 🏗️ Architecture

### Asynchronous Processing
- **BullMQ + Redis**: Job queues for AI operations
- **Worker Process**: Separate worker handles AI generation jobs
- **Retry Logic**: Exponential backoff with 3 retry attempts
- **Job Persistence**: Recent jobs kept for monitoring

### Real-time Communication
- **Socket.IO**: WebSocket connections for live updates
- **Room-based**: Separate channels for students, teachers, and admins
- **Events**:
  - `problem:generated` - Problem ready for student
  - `feedback:received` - Feedback ready for submission
  - `student:activity` - Activity broadcast to teachers
  - `queue:update` - Queue stats for admins

### Adaptive Difficulty Algorithm
- Tracks last 5 problem results per student
- **Increase to HARD**: ≥80% correct (4/5)
- **Decrease to EASY**: ≤40% correct (2/5)
- **Stay at MEDIUM**: Between 40-80%

### Gamification System
- **Badges**:
  - 🔥 Streak Master: 5 correct in a row
  - 💪 Persistence: 10 problems completed
  - ⭐ Perfectionist: 10 problems with 100% accuracy
  - ⚡ Quick Solver: 5 problems in under 10 minutes
  - 🎓 Math Genius: 50 problems total
- Automatically awarded by worker process
- Displayed on student dashboard and teacher view

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── problems/      # Problem generation and submission
│   │   ├── progress/      # Student progress tracking
│   │   ├── teacher/       # Teacher-specific endpoints
│   │   └── admin/         # Admin queue monitoring
│   ├── student/           # Student dashboard
│   ├── teacher/           # Teacher dashboard
│   ├── admin/             # Admin dashboard
│   └── login/             # Login/Register page
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── redis.ts           # Redis connection
│   ├── queue.ts           # BullMQ queue setup
│   ├── worker.ts          # Job processor
│   ├── socket.ts          # Socket.IO config
│   ├── auth.ts            # JWT authentication
│   └── hooks/             # React hooks
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
└── server.ts              # Custom Next.js server
```

## 🗄️ Database Schema

### Core Tables
- **users**: User accounts with roles (STUDENT, TEACHER, ADMIN)
- **math_problem_sessions**: Generated problems with difficulty levels
- **math_problem_submissions**: Student answers and feedback
- **user_progress**: Tracking metrics (streak, accuracy, difficulty)
- **badges**: Available achievement badges
- **user_badges**: Awarded badges per user
- **system_logs**: System activity logging

## 🚀 Deployment

### Prerequisites for Production
1. **Redis**: Upstash Redis or managed Redis instance
2. **Database**: PostgreSQL (Supabase provided)
3. **Environment Variables**: All required vars configured
4. **Worker Process**: Deploy worker separately or as background job

### Vercel Deployment Notes
- Socket.IO may require serverless-compatible alternative
- BullMQ workers need separate deployment (Railway, Render, etc.)
- Consider using Supabase Realtime as Socket.IO alternative
- Or deploy full stack to Railway/Render/DigitalOcean

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Problems (Student)
- `POST /api/problems/generate` - Generate new problem
- `GET /api/problems/[sessionId]` - Get problem details
- `POST /api/problems/submit` - Submit answer

### Progress
- `GET /api/progress` - Get user progress, badges, and history

### Teacher
- `GET /api/teacher/students` - List all students with progress
- `GET /api/teacher/analytics` - System-wide analytics

### Admin
- `GET /api/admin/queues` - Get BullMQ queue statistics

## 🎯 Implementation Highlights

### 1. Asynchronous AI Processing
- Problem generation doesn't block the UI
- Users get immediate feedback that processing has started
- Real-time updates via Socket.IO when complete

### 2. Adaptive Learning
- System tracks performance and adjusts difficulty automatically
- Encourages growth without overwhelming students

### 3. Gamification
- Badges provide motivation and recognition
- Streak system encourages consistent practice

### 4. Real-time Collaboration
- Teachers see student activity as it happens
- Enables immediate intervention if needed

### 5. Scalable Architecture
- BullMQ handles high job volumes
- Worker processes can be horizontally scaled
- Redis provides fast caching and queue management

## 🛠️ Development Commands

```bash
npm run dev              # Start Next.js with custom server
npm run worker           # Start BullMQ worker
npm run dev:all          # Start both concurrently
npm run build            # Build for production
npm run start            # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Push schema to database
npm run prisma:migrate   # Create migrations
npm run seed             # Seed test data
```

## 🐛 Troubleshooting

### Redis Connection Error
- Ensure Redis is running: `redis-server`
- Check REDIS_HOST and REDIS_PORT in .env

### Worker Not Processing Jobs
- Ensure worker is running: `npm run worker`
- Check Redis connection in worker terminal
- Verify CLAUDE_API_KEY is set

### Database Errors
- Run `npm run prisma:generate` after schema changes
- Use `npm run prisma:push` to sync schema with database

### Socket.IO Not Connecting
- Ensure custom server is running (`npm run dev`)
- Check browser console for connection errors
- Verify Socket.IO path in client matches server

---

Built with ❤️ for Primary 5 Mathematics Education