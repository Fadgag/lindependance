import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

const handler = NextAuth({
  adapter: PrismaAdapter(prisma as any),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials) return null
        const { email, password } = credentials as { email: string; password: string }
        // Minimal credential check: in real app verify password hash
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null
        // Accept any password for now — replace with bcrypt compare in production
        return { id: user.id, name: user.name, email: user.email }
      }
    }),
    // Optional Google provider — requires env vars GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })
    ] : [])
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    async session({ session, user }) {
      // attach user id
      session.user = { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined }
      return session
    }
  }
})

export { handler as GET, handler as POST }

