import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { CollectionWordsView } from '@/components/collections/collection-words-view'
import { SUPPORTED_LANGUAGES } from '@/types'
import type { Word } from '@/types'
import { ArrowLeft, Globe, Lock } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  const t = await getTranslations('collections')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch the collection (may be owned or followed)
  const { data: collection } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single()

  if (!collection) notFound()

  const isOwner = collection.user_id === user.id

  // Check access: owner or follower
  if (!isOwner) {
    const { data: follow } = await supabase
      .from('collection_follows')
      .select('id')
      .eq('collection_id', id)
      .eq('user_id', user.id)
      .single()
    if (!follow) notFound()
  }

  const { data: collectionWordsRaw } = await supabase
    .from('collection_words')
    .select('word_id, words(*)')
    .eq('collection_id', id)
    .order('added_at', { ascending: false })

  const collectionWords = (collectionWordsRaw ?? []) as unknown as Array<{
    word_id: string
    words: Word
  }>

  const words = collectionWords.map((cw) => cw.words).filter(Boolean)

  const { data: allCollections } = await supabase
    .from('collections')
    .select('id, name')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  const { data: progressRaw } = await supabase
    .from('word_progress')
    .select('word_id, is_learned')
    .eq('user_id', user.id)

  const learnedWordIds = new Set(
    (progressRaw ?? []).filter((p) => p.is_learned).map((p) => p.word_id)
  )

  const { data: profileRaw } = await supabase
    .from('users')
    .select('default_source_lang, default_target_lang')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { default_source_lang: string; default_target_lang: string } | null

  const sourceLangLabel = SUPPORTED_LANGUAGES[collection.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? collection.source_lang
  const targetLangLabel = SUPPORTED_LANGUAGES[collection.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? collection.target_lang

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/collections" className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{collection.name}</h1>
            {collection.is_default && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                {t('default_badge')}
              </span>
            )}
            {!isOwner && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                {t('followed_badge')}
              </span>
            )}
            {collection.is_public ? (
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('words_count', { count: words.length })} · {sourceLangLabel} → {targetLangLabel}
          </p>
        </div>
      </div>

      <CollectionWordsView
        collectionId={id}
        isOwner={isOwner}
        words={words}
        learnedWordIds={learnedWordIds}
        collections={allCollections ?? []}
        defaultSourceLang={profile?.default_source_lang ?? collection.source_lang}
        defaultTargetLang={profile?.default_target_lang ?? collection.target_lang}
      />
    </div>
  )
}
