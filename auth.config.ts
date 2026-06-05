import type { NextAuthConfig } from "next-auth"
import { NextResponse } from "next/server"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isLoggedIn = !!auth?.user

      if (pathname === "/login") {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL("/", request.nextUrl))
        }

        return true
      }

      if (pathname === "/") {
        return isLoggedIn
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email ?? undefined
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }

      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
