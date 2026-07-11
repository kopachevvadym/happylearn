import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { BookOpen, Repeat2, Globe, Zap } from 'lucide-react'
import { PublicHeader } from '@/components/shared/public-header'

export default function LandingPage() {
  const t = useTranslations('landing')

  return (
    <div className="flex flex-col min-h-full">
      <PublicHeader />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            {t('hero_title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            {t('hero_subtitle')}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/auth"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {t('cta_start')}
            </Link>
            <Link
              href="/catalog"
              className="border border-border px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors"
            >
              {t('cta_catalog')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center gap-3 p-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Repeat2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{t('feature_sr_title')}</h3>
            <p className="text-muted-foreground text-sm">{t('feature_sr_desc')}</p>
          </div>
          <div className="flex flex-col items-center text-center gap-3 p-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{t('feature_shared_title')}</h3>
            <p className="text-muted-foreground text-sm">{t('feature_shared_desc')}</p>
          </div>
          <div className="flex flex-col items-center text-center gap-3 p-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{t('feature_api_title')}</h3>
            <p className="text-muted-foreground text-sm">{t('feature_api_desc')}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 happylearn.club</span>
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            <span>happylearn.club</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
