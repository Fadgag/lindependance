import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions = {
  adapter: PrismaAdapter(prisma as any),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.hashedPassword) return null
        const valid = await bcrypt.compare(credentials.password, user.hashedPassword)
        if (!valid) return null
        return { id: user.id, name: user.name, email: user.email }
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })
    ] : [])
  ],
  session: { strategy: 'database' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async session({ session, user }) {
      ;(session as any).user = { ...(session.user ?? {}), id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, organizationId: (user as any).organizationId ?? null }
      return session
    }
  }
}

export default authOptions

