import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

export const metadata: Metadata = {
  title: 'happylearn.club — Learn words with joy',
  description:
    'Free service for learning words in any language with shared collections and spaced repetition',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'uk' | 'en')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </ThemeProvider>
  )
}
