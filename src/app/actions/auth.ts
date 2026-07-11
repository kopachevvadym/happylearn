'use server'

import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
})

export async function loginWithPassword(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    const t = await getTranslations('errors')
    return { error: t('invalid_credentials') }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: error.message }
  }

  redirect(`/${await getLocale()}/dashboard`)
}

export async function registerWithPassword(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    username: formData.get('username') as string,
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const t = await getTranslations('errors')
    return { error: parsed.error.issues[0]?.message ?? t('invalid_data') }
  }

  const supabase = await createClient()

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('username', parsed.data.username)
    .maybeSingle()

  if (existing) {
    const t = await getTranslations('errors')
    return { error: t('username_taken') }
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { username: parsed.data.username },
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect(`/${await getLocale()}/onboarding`)
}

export async function loginWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get('email') as string

  if (!email || !z.string().email().safeParse(email).success) {
    const t = await getTranslations('errors')
    return { error: t('invalid_email') }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/${await getLocale()}/auth`)
}
