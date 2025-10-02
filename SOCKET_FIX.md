# Socket Connection Fix

## Problem Identified
The socket client had TWO issues:
1. ❌ Not reading `NEXT_PUBLIC_SOCKET_URL` environment variable
2. ❌ Using wrong path (`/api/socket`) for standalone socket server

## Root Cause
Your codebase has two socket server setups:
- **Integrated**: Runs with Next.js at `/api/socket` (for local dev with `npm run dev`)
- **Standalone**: Runs separately with no custom path (for production at `socket.academicwebsolution.com`)

The client was always using `/api/socket` path, which doesn't exist on your standalone server.

## Changes Made
Updated `lib/hooks/useSocket.tsx` to:
1. ✅ Read `NEXT_PUBLIC_SOCKET_URL` from environment variables
2. ✅ Automatically detect if using integrated or standalone server
3. ✅ Only use `/api/socket` path for integrated server
4. ✅ Add proper reconnection configuration
5. ✅ Add error logging for debugging

## Required Steps

### 1. Verify Your Socket Server is Running
Your standalone socket server (`socket-server.ts`) must be running at:
```
https://socket.academicwebsolution.com
```

Check that it's accessible and has proper SSL certificate.

### 2. Update Your .env File
Make sure your `.env` file contains:
```bash
NEXT_PUBLIC_SOCKET_URL=https://socket.academicwebsolution.com
```

**IMPORTANT**: 
- The variable MUST start with `NEXT_PUBLIC_` to be accessible in client-side code
- Use `https://` for production with SSL
- Do NOT include trailing slash or path

### 2. Restart Your Next.js Server
Environment variables are only loaded when the dev server starts. You MUST restart:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Verify the Connection
After restarting, check the browser console. You should see:
```
✅ Socket connected to: https://socket.academicwebsolution.com
```

If you see connection errors, check:
- ✅ Socket server is running at `https://socket.academicwebsolution.com`
- ✅ Server is running `socket-server.ts` (NOT the integrated version)
- ✅ CORS is properly configured on the server
- ✅ SSL certificate is valid (for HTTPS)
- ✅ WebSocket upgrade is enabled in your reverse proxy (Nginx/Apache)
- ✅ No firewall blocking the connection

### 4. Verify WebSocket URL
In browser Network tab, you should see WebSocket connection to:
```
wss://socket.academicwebsolution.com/socket.io/?EIO=4&transport=websocket
```

**NOT** (with /api/socket path):
```
wss://socket.academicwebsolution.com/api/socket/socket.io/?EIO=4&transport=websocket
```

## Server CORS Configuration
Your socket server should have CORS enabled (already configured in `socket-server.ts`):
```javascript
cors: {
  origin: '*',
  credentials: true,
}
```

For production, change `origin: '*'` to your specific domain.
