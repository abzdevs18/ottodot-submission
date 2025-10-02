# Socket Connection Fix

## Problem Identified
The socket client was not connecting to your external socket server because it wasn't using the `NEXT_PUBLIC_SOCKET_URL` environment variable.

## Changes Made
Updated `lib/hooks/useSocket.tsx` to:
1. ✅ Read `NEXT_PUBLIC_SOCKET_URL` from environment variables
2. ✅ Add proper connection configuration with reconnection logic
3. ✅ Add error logging for connection issues
4. ✅ Support both WebSocket and polling transports

## Required Steps

### 1. Update Your .env File
Make sure your `.env` file contains:
```bash
NEXT_PUBLIC_SOCKET_URL=https://socket.academicwebsolution.com
```

**IMPORTANT**: The variable MUST start with `NEXT_PUBLIC_` to be accessible in client-side code.

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
- ✅ CORS is properly configured on the server
- ✅ SSL certificate is valid (for HTTPS)
- ✅ No firewall blocking the connection

## Server CORS Configuration
Your socket server should have CORS enabled (already configured in `socket-server.ts`):
```javascript
cors: {
  origin: '*',
  credentials: true,
}
```

For production, change `origin: '*'` to your specific domain.
