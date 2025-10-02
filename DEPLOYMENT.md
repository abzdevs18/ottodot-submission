# Deployment Guide

## 🚀 Deployment Options

### Option 1: Full-Stack Deployment (Recommended)

Deploy to platforms that support long-running processes and WebSockets.

**Recommended Platforms:**
- Railway
- Render
- DigitalOcean App Platform
- Heroku
- AWS EC2/ECS

#### Railway Deployment (Easiest)

1. **Setup Redis**
   ```bash
   # Railway provides Redis add-on
   railway add redis
   ```

2. **Configure Environment Variables**
   ```
   DATABASE_URL=<from railway postgres>
   DIRECT_URL=<from railway postgres>
   GOOGLE_API_KEY=<your key>
   JWT_SECRET=<random secret>
   REDIS_HOST=<from railway redis>
   REDIS_PORT=<from railway redis>
   REDIS_PASSWORD=<from railway redis>
   ```

3. **Add Procfile**
   Create `Procfile`:
   ```
   web: npm run build && npm run start
   worker: npm run worker
   ```

4. **Deploy**
   ```bash
   # Connect to Railway
   railway login
   railway init
   
   # Deploy
   railway up
   ```

5. **Setup Database**
   ```bash
   railway run npm run prisma:push
   railway run npm run seed
   ```

### Option 2: Vercel + Separate Worker

Deploy frontend to Vercel, worker to Railway/Render.

#### Vercel (Frontend Only)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Configure Environment Variables in Vercel Dashboard**
   - All DATABASE_* vars
   - GOOGLE_API_KEY
   - JWT_SECRET
   - REDIS_* vars (from separate Redis instance)

3. **Modify for Serverless**
   
   Create `vercel.json`:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "framework": "nextjs",
     "rewrites": [
       {
         "source": "/api/socket",
         "destination": "/api/socket-stub"
       }
     ]
   }
   ```

   **Note**: Socket.IO won't work on Vercel serverless. Alternative:
   - Use Supabase Realtime instead
   - Or deploy to Railway for Socket.IO support

4. **Deploy**
   ```bash
   vercel --prod
   ```

#### Worker (Separate Deployment)

Deploy worker to Railway/Render:

1. **Create new service**
2. **Set environment variables** (same as above)
3. **Set start command**: `npm run worker`
4. **Deploy**

### Option 3: Docker Deployment

#### Docker Compose Setup

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DIRECT_URL=${DIRECT_URL}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    command: npm run dev

  worker:
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DIRECT_URL=${DIRECT_URL}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    command: npm run worker

volumes:
  redis-data:
```

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
```

Deploy:
```bash
docker-compose up -d
```

## 🌐 Production Checklist

### Security
- [ ] Change JWT_SECRET to a strong random value
- [ ] Enable HTTPS/SSL
- [ ] Set secure cookie flags in production
- [ ] Add rate limiting to API routes
- [ ] Sanitize user inputs
- [ ] Enable CORS properly
- [ ] Keep dependencies updated

### Database
- [ ] Run database migrations: `npm run prisma:push`
- [ ] Seed initial data: `npm run seed`
- [ ] Enable connection pooling (already configured)
- [ ] Setup database backups
- [ ] Monitor database performance

### Redis
- [ ] Use production Redis instance (not local)
- [ ] Enable Redis persistence (RDB or AOF)
- [ ] Set Redis password
- [ ] Monitor Redis memory usage
- [ ] Configure maxmemory policy

### Environment Variables
- [ ] GOOGLE_API_KEY set
- [ ] JWT_SECRET set (strong random string)
- [ ] DATABASE_URL set
- [ ] DIRECT_URL set
- [ ] REDIS_HOST set
- [ ] REDIS_PORT set
- [ ] REDIS_PASSWORD set (if applicable)
- [ ] NODE_ENV=production

### Monitoring
- [ ] Setup error tracking (Sentry, Bugsnag)
- [ ] Setup application monitoring (Datadog, New Relic)
- [ ] Monitor queue health
- [ ] Setup logging (Winston, Pino)
- [ ] Monitor API response times
- [ ] Track user activity

### Performance
- [ ] Enable Next.js image optimization
- [ ] Setup CDN for static assets
- [ ] Enable compression
- [ ] Optimize database queries
- [ ] Scale worker processes as needed
- [ ] Cache frequently accessed data

### Testing
- [ ] Test all user flows
- [ ] Test error scenarios
- [ ] Load test API endpoints
- [ ] Test Socket.IO connections
- [ ] Test queue processing under load
- [ ] Verify badge awarding logic
- [ ] Test adaptive difficulty

## 🔧 Redis Hosting Options

### 1. Upstash (Recommended for Vercel)
- ✅ Serverless-friendly
- ✅ Free tier available
- ✅ Low latency
- 🌐 https://upstash.com

Setup:
```bash
# Get connection string from Upstash dashboard
REDIS_HOST=<endpoint>.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=<password>
```

### 2. Redis Cloud
- ✅ Free 30MB tier
- ✅ Managed service
- ✅ Good performance
- 🌐 https://redis.com/try-free

### 3. Railway Redis
- ✅ Integrated with Railway
- ✅ Simple setup
- ✅ Good for all-in-one deployment

### 4. Self-Hosted
- Docker container
- VPS (DigitalOcean, Linode)
- AWS ElastiCache

## 📊 Scaling Considerations

### Horizontal Scaling

**Web Server:**
- Deploy multiple Next.js instances behind load balancer
- Use sticky sessions for Socket.IO
- Or use Redis adapter for Socket.IO

**Workers:**
- Deploy multiple worker instances
- BullMQ automatically distributes jobs
- Scale based on queue length

**Database:**
- Use read replicas for analytics queries
- Connection pooling (already configured)
- Consider caching frequently accessed data

### Monitoring Queue Health

```javascript
// Example monitoring script
import { problemQueue, feedbackQueue } from './lib/queue'

async function checkQueueHealth() {
  const problemCounts = await problemQueue.getJobCounts()
  const feedbackCounts = await feedbackQueue.getJobCounts()
  
  // Alert if too many waiting jobs
  if (problemCounts.waiting > 50) {
    console.warn('High problem queue backlog!')
    // Send alert to admin
  }
  
  // Alert on failures
  if (problemCounts.failed > 10) {
    console.error('Too many failed jobs!')
    // Send alert to admin
  }
}

setInterval(checkQueueHealth, 60000) // Check every minute
```

## 🎯 Deployment Steps Summary

### Railway (Recommended)
1. Create Railway account
2. Create new project
3. Add PostgreSQL (or use existing Supabase)
4. Add Redis plugin
5. Deploy from GitHub
6. Set environment variables
7. Run `railway run npm run prisma:push`
8. Run `railway run npm run seed`
9. Access deployed URL

### Render
1. Create Render account
2. Create PostgreSQL database (or use Supabase)
3. Create Redis instance
4. Create Web Service (for Next.js)
5. Create Background Worker (for BullMQ)
6. Set environment variables
7. Deploy both services
8. Run migrations via Render dashboard

### DigitalOcean App Platform
1. Create DigitalOcean account
2. Setup managed PostgreSQL (or use Supabase)
3. Setup managed Redis
4. Create App from GitHub
5. Add worker component
6. Configure environment variables
7. Deploy

## 🔐 Security Best Practices

### API Security
```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use('/api/', limiter)
```

### Input Validation
```typescript
import { z } from 'zod'

const submitAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  userAnswer: z.number(),
  timeTaken: z.number().optional()
})

// Validate in route
const body = submitAnswerSchema.parse(await request.json())
```

### Environment Variables
- Never commit `.env` file
- Use secrets management in production
- Rotate JWT_SECRET periodically
- Use different secrets per environment

## 📈 Performance Optimization

### Database
- Add indexes on frequently queried fields (already done)
- Use select to fetch only needed fields
- Implement pagination for large result sets

### Caching
```typescript
// Cache user progress
import { redis } from './lib/redis'

async function getUserProgress(userId: string) {
  const cached = await redis.get(`progress:${userId}`)
  if (cached) return JSON.parse(cached)
  
  const progress = await prisma.userProgress.findUnique({
    where: { userId }
  })
  
  await redis.setex(`progress:${userId}`, 300, JSON.stringify(progress))
  return progress
}
```

### Queue Optimization
- Adjust concurrency based on AI API limits
- Implement job prioritization if needed
- Monitor and tune retry logic

## 🆘 Troubleshooting Production Issues

### High Queue Backlog
- Scale worker instances
- Check AI API rate limits
- Verify worker is running
- Check Redis connection

### Socket.IO Disconnections
- Use Redis adapter for multi-instance deployments
- Enable sticky sessions
- Increase timeout values

### Database Connection Errors
- Check connection pool limits
- Verify PgBouncer configuration
- Monitor active connections

### Memory Issues
- Monitor Node.js heap usage
- Implement memory limits in Docker
- Check for memory leaks in worker
- Restart workers periodically

---

**Need help with deployment?** Check the platform-specific documentation or open an issue on GitHub.
