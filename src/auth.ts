import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authorizeCredentials } from "@/services/auth-rate-limit.service"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        return authorizeCredentials(credentials, request)
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // RAISON: user shape declared in src/types/next-auth.d.ts — narrow to expected fields
      if (user && typeof user === 'object') {
        const u = user as {
          id?: string
          organizationId?: string | null
          role?: string | null
          accountType?: 'STAFF' | 'CUSTOMER'
        }
        if (u.id) token.id = u.id
        if (u.organizationId) token.organizationId = u.organizationId
        if (u.role) token.role = u.role
        if (u.accountType) token.accountType = u.accountType
      }
      return token
    },
    async session({ session, token }) {
      // RAISON: token (JWT) may contain organizationId/role claims
      if (session?.user && token && typeof token === 'object') {
        const t = token as {
          id?: string
          sub?: string
          organizationId?: string | null
          role?: string | null
          accountType?: 'STAFF' | 'CUSTOMER'
        }
        session.user.id = (t.id ?? t.sub) as string
        session.user.organizationId = t.organizationId ?? null
        session.user.role = t.role ?? 'USER'
        session.user.accountType = t.accountType === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF'
      }
      return session
    },
  },
  pages: { signIn: "/auth/signin" },
})


