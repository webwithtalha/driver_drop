"use server"

import { AuthError } from "next-auth"

import { signIn, signOut } from "@/auth"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

export async function loginAction(input: LoginInput) {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." }
    }

    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
