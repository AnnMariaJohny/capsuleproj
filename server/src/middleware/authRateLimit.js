const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 12
const attemptsByIp = new Map()

export function limitAuthAttempts(req, res, next) {
  const now = Date.now()
  const ip = req.ip || 'unknown'
  const previous = attemptsByIp.get(ip)
  const bucket = !previous || now - previous.startedAt >= WINDOW_MS
    ? { startedAt: now, count: 0 }
    : previous

  if (bucket.count >= MAX_ATTEMPTS) {
    res.set('Retry-After', String(Math.ceil((WINDOW_MS - (now - bucket.startedAt)) / 1000)))
    return res.status(429).json({ message: 'Too many account attempts. Please wait a few minutes and try again.' })
  }

  bucket.count += 1
  attemptsByIp.set(ip, bucket)
  return next()
}
