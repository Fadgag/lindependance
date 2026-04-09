import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.hashedPassword) return null
        const isValid = await bcrypt.compare(credentials.password as string, user.hashedPassword)
        return isValid ? { id: user.id, email: user.email, organizationId: user.organizationId, role: user.role } : null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // RAISON: user shape declared in src/types/next-auth.d.ts — narrow to expected fields
      if (user && typeof user === 'object') {
        const u = user as { id?: string; organizationId?: string | null; role?: string | null }
        if (u.id) token.id = u.id
        if (u.organizationId) token.organizationId = u.organizationId
        if (u.role) token.role = u.role
      }
      return token
    },
    async session({ session, token }) {
      // RAISON: token (JWT) may contain organizationId/role claims
      if (session?.user && token && typeof token === 'object') {
        const t = token as { id?: string; sub?: string; organizationId?: string | null; role?: string | null }
        session.user.id = (t.id ?? t.sub) as string
        session.user.organizationId = t.organizationId ?? null
        session.user.role = t.role ?? 'USER'
      }
      return session
    },
  },
  pages: { signIn: "/auth/signin" },
})




