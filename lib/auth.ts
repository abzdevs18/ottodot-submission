// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export interface JWTPayload {
  userId: string
  email: string
  name: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check cookie
  const token = request.cookies.get('auth-token')?.value
  if (token) {
    return token
  }

  return null
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

export function requireAuth(request: NextRequest): JWTPayload {
  const user = getUserFromRequest(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export function requireRole(request: NextRequest, allowedRoles: Array<'STUDENT' | 'TEACHER' | 'ADMIN'>): JWTPayload {
  const user = requireAuth(request)
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
  return user
}
