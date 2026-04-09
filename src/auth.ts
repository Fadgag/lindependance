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
      // Les types user.organizationId et user.role sont déclarés dans src/types/next-auth.d.ts
      if (user?.organizationId) token.organizationId = user.organizationId
      if (user?.role) token.role = user.role
      return token
    },
    async session({ session, token }) {
      // Les types token.organizationId et session.user.organizationId sont déclarés dans src/types/next-auth.d.ts
      if (session.user) {
        session.user.organizationId = token.organizationId ?? null
        session.user.role = (token.role as string) ?? 'USER'
      }
      return session
    },
  },
  pages: { signIn: "/auth/signin" },
})




