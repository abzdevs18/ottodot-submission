# Socket Port Configuration Summary

## ✅ All Socket Configurations Verified - Port 3011

### Core Files
| File | Configuration | Status |
|------|---------------|--------|
| `socket-server.ts` | `PORT = 3011` | ✅ Correct |
| `lib/hooks/useSocket.tsx` | Fallback: `http://localhost:3011` | ✅ Correct |
| `package.json` | Added `npm run socket` script | ✅ Added |
| `README.md` | Updated documentation | ✅ Updated |

### Port Assignments
- **3000** - Next.js app (server.ts with integrated Socket.IO at `/api/socket`)
- **3011** - Standalone Socket.IO server (socket-server.ts)
- **Worker** - BullMQ worker process (no port, uses Redis)

## 🚀 Running the Application

### Option 1: Integrated Socket (Development - Simpler)
Uses Socket.IO integrated with Next.js on port 3000 at path `/api/socket`

```bash
# Terminal 1: Run Next.js + Integrated Socket.IO
npm run dev

# Terminal 2: Run Worker
npm run worker
```

**Environment:**
```bash
# .env - No NEXT_PUBLIC_SOCKET_URL needed (defaults to same origin)
```

### Option 2: Standalone Socket (Production-like)
Uses separate Socket.IO server on port 3011

```bash
# Terminal 1: Run Next.js
npm run dev

# Terminal 2: Run Worker
npm run worker

# Terminal 3: Run Standalone Socket Server
npm run socket
```

**Or use the combined script:**
```bash
npm run dev:standalone
```

**Environment:**
```bash
# .env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3011
```

### Production Deployment
```bash
# .env
NEXT_PUBLIC_SOCKET_URL=https://socket.academicwebsolution.com
```

## 🔍 How Socket Server Selection Works

The client (`lib/hooks/useSocket.tsx`) automatically detects which server to use:

```typescript
// Auto-detection logic:
const isIntegratedServer = socketUrl.includes('localhost:3000') || 
                           socketUrl === window.location.origin

// Integrated server → uses path: '/api/socket'
// Standalone server → no custom path
```

## ✅ Verification Checklist

- [x] `socket-server.ts` runs on port **3011**
- [x] `useSocket.tsx` defaults to `localhost:3011`
- [x] `package.json` has `socket` script
- [x] `README.md` documentation updated
- [x] No references to old port 3001 remain

## 🎯 Current Configuration Status

**Your socket server is now properly configured to run on port 3011!**

To test:
1. Run `npm run socket` to start standalone socket server
2. Check console output: `🔌 Socket.IO server running on http://localhost:3011`
3. Access your app and verify connection in browser console
