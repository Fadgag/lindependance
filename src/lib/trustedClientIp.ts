import { isIP } from 'node:net'

export function getTrustedClientIp(request: Request): string | null {
  const trustedIp = process.env.VERCEL === '1'
    ? request.headers.get('x-vercel-forwarded-for')
    : process.env.TRUSTED_PROXY_IP === 'true'
      ? request.headers.get('x-real-ip')
      : null

  const ip = trustedIp?.trim()
  return ip && isIP(ip) !== 0 ? ip : null
}
