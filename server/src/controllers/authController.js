import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import User from '../models/User.js'
import { createAccessToken, toPublicUser } from '../middleware/authenticate.js'

const scrypt = promisify(scryptCallback)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
User.memoryUsers ||= new Map()

async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = await scrypt(password, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

async function passwordMatches(password, stored) {
  const [salt, hashHex] = stored.split(':')
  if (!salt || !hashHex || !/^[a-f\d]+$/i.test(hashHex)) return false
  const actual = await scrypt(password, salt, 64)
  const expected = Buffer.from(hashHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function normalizeUser(user) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    companyName: user.companyName || '',
    companySize: user.companySize || '',
    passwordHash: user.passwordHash,
  }
}

async function findByEmail(email) {
  if (User.db.readyState === 1) {
    const user = await User.findOne({ email }).select('+passwordHash').lean()
    return user ? normalizeUser(user) : null
  }
  return [...User.memoryUsers.values()].find((user) => user.email === email) || null
}

function publicAccount(user) {
  const account = { ...user, _id: user._id }
  return { token: createAccessToken(account), user: toPublicUser(account) }
}

export async function register(req, res, next) {
  try {
    const { name, email, password, role, companyName, companySize } = req.body || {}
    const cleanName = typeof name === 'string' ? name.trim() : ''
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const cleanCompany = typeof companyName === 'string' ? companyName.trim() : ''
    if (!cleanName || cleanName.length > 80 || !emailPattern.test(cleanEmail) || cleanEmail.length > 254
      || typeof password !== 'string' || password.length < 10 || password.length > 128
      || !['individual', 'company'].includes(role)
      || (role === 'company' && (!cleanCompany || cleanCompany.length > 120))) {
      return res.status(400).json({ message: 'Enter a valid name and email, a password of at least 10 characters, and a company name for company accounts.' })
    }

    if (await findByEmail(cleanEmail)) {
      return res.status(409).json({ message: 'An account with that email already exists.' })
    }

    const passwordHash = await hashPassword(password)
    const details = {
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role,
      companyName: role === 'company' ? cleanCompany : '',
      companySize: role === 'company' && typeof companySize === 'string' ? companySize.slice(0, 40) : '',
    }
    let user
    if (User.db.readyState === 1) {
      user = normalizeUser(await User.create(details))
    } else {
      User.memoryUsers ||= new Map()
      user = { ...details, _id: randomBytes(12).toString('hex') }
      User.memoryUsers.set(user._id, user)
    }
    return res.status(201).json(publicAccount(user))
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with that email already exists.' })
    }
    return next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, role } = req.body || {}
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (!emailPattern.test(cleanEmail) || typeof password !== 'string' || !['individual', 'company'].includes(role)) {
      return res.status(400).json({ message: 'Enter your email, password, and account type.' })
    }
    const user = await findByEmail(cleanEmail)
    if (!user || user.role !== role || !await passwordMatches(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Email, password, or account type is incorrect.' })
    }
    return res.json(publicAccount(user))
  } catch (error) {
    return next(error)
  }
}

export async function currentUser(req, res) {
  return res.json({ user: req.user })
}
