import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import User from '../models/User.js'

const tokenSecret = process.env.AUTH_TOKEN_SECRET || randomBytes(32).toString('hex')

function safeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    companyName: user.companyName || '',
    companySize: user.companySize || '',
  }
}

function sign(value) {
  return createHmac('sha256', tokenSecret).update(value).digest('base64url')
}

export function createAccessToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: String(user._id),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function toPublicUser(user) {
  return safeUser(user)
}

export function authenticate(req, res, next) {
  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Please log in to continue.' })
  }

  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) {
    return res.status(401).json({ message: 'Your session is invalid. Please log in again.' })
  }

  const expected = Buffer.from(sign(payload))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).json({ message: 'Your session is invalid. Please log in again.' })
  }

  let claims
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return res.status(401).json({ message: 'Your session is invalid. Please log in again.' })
  }
  if (typeof claims.id !== 'string' || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' })
  }

  const lookup = User.db.readyState === 1
    ? User.findById(claims.id).lean()
    : Promise.resolve(User.memoryUsers?.get(claims.id) || null)
  return lookup.then((user) => {
    if (!user) return res.status(401).json({ message: 'This account is no longer available. Please log in again.' })
    req.user = safeUser(user)
    return next()
  }).catch(next)
}
