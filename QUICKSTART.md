# 🚀 Quick Start Guide

Get the Math Problem Generator up and running in 5 minutes!

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Redis installed (or Upstash account)
- ✅ Google AI API key

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit the `.env` file and add:

```env
# REQUIRED: Google AI API Key
CLAUDE_API_KEY=your_claude_api_key_here

# REQUIRED: JWT Secret (use any random string)
JWT_SECRET=your_random_secure_secret_here_change_in_production

# REQUIRED: Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Already configured - Database connection
DATABASE_URL="postgresql://postgres.gspwrguoayjivlqlwkpn:xxxx@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.gspwrguoayjivlqlwkpn:xxxx@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**Get Google AI API Key:**
- Go to https://makersuite.google.com/app/apikey
- Click "Create API Key"
- Copy and paste into `.env`

**Redis Options:**
- **Local**: Install Redis and run `redis-server`
- **Cloud**: Sign up at https://upstash.com (free tier)

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Seed test data (users and badges)
npm run seed
```

### 4. Start Redis (if local)

Open a new terminal:
```bash
redis-server
```

Keep this terminal running.

### 5. Start the Application

**Option A: Run everything together**
```bash
npm run dev:all
```

**Option B: Run separately (recommended for debugging)**

Terminal 1 - Next.js Server:
```bash
npm run dev
```

Terminal 2 - BullMQ Worker:
```bash
npm run worker
```

### 6. Access the Application

Open your browser to: **http://localhost:3000**

## 🔐 Test Accounts

Use these credentials to log in:

| Role | Email | Password |
|------|-------|----------|
| **Student** | student1@test.com | password123 |
| **Teacher** | teacher1@test.com | password123 |
| **Admin** | admin@test.com | password123 |

## 🎯 What to Try

### As a Student
1. Click "Generate New Problem"
2. Wait for AI to create a problem (usually 3-5 seconds)
3. Enter your answer and submit
4. See personalized feedback
5. Watch your progress stats update
6. Earn badges as you solve problems!

### As a Teacher
1. Open teacher dashboard
2. See all students and their progress
3. Watch the real-time activity feed
4. View analytics and top performers
5. Keep it open while students work

### As an Admin
1. Open admin dashboard
2. Monitor BullMQ job queues
3. Watch jobs being processed in real-time
4. Enable auto-refresh for live updates

## ⚠️ Common Issues

### "Cannot connect to Redis"
- **Solution**: Make sure Redis is running
  ```bash
  redis-server
  ```

### "Worker not processing jobs"
- **Solution**: Start the worker
  ```bash
  npm run worker
  ```

### "Prisma Client not found"
- **Solution**: Generate Prisma Client
  ```bash
  npm run prisma:generate
  ```

### "Invalid Google API Key"
- **Solution**: Check your CLAUDE_API_KEY in `.env`
- Make sure you're using Claude 3.5 Sonnet API key

### Socket.IO not connecting
- **Solution**: Make sure you're using `npm run dev`, not `next dev`
- The custom server is required for Socket.IO

## 📊 Architecture Overview

```
┌─────────────┐
│  Next.js    │  ← Frontend (React)
│  + Socket   │
└──────┬──────┘
       │
       ├─────► PostgreSQL (Supabase) ← Database
       │
       ├─────► Redis ← Queue Storage
       │            │
       │            ├─► BullMQ ← Job Queue
       │            │      │
       │            │      └─► Worker ← AI Processing
       │            │
       └────────────┴─► Socket.IO ← Real-time
```

## 🎓 Flow Example

1. **Student generates problem**
   - POST /api/problems/generate
   - Creates session in DB
   - Adds job to BullMQ
   - Returns immediately to student

2. **Worker processes job**
   - Picks up job from queue
   - Calls Google Gemini AI
   - Saves problem to DB
   - Emits Socket.IO event

3. **Student receives problem**
   - Socket.IO pushes update
   - UI displays generated problem
   - Student can now answer

4. **Student submits answer**
   - POST /api/problems/submit
   - Checks correctness
   - Adds feedback job to queue
   - Returns immediately

5. **Worker generates feedback**
   - AI generates personalized feedback
   - Updates progress & badges
   - Emits to student
   - Broadcasts to teachers

## 💡 Tips

- Use multiple browser windows to test different roles simultaneously
- Check browser console for Socket.IO connection status
- Monitor worker terminal for job processing logs
- Redis CLI: `redis-cli` to inspect queues manually

## 📚 Next Steps

- Read full README.md for detailed documentation
- Review your plan.md for feature implementation details
- Check API endpoints in README for integration
- Explore Prisma schema for database structure

---

Happy coding! 🎉
