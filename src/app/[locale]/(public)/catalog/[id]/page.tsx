import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Globe } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { SUPPORTED_LANGUAGES } from '@/types'
import type { Word } from '@/types'
import { PublicWordsTable } from '@/components/catalog/PublicWordsTable'

export default async function CatalogCollectionPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id } = await params
  const t = await getTranslations('CollectionPage')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch the public collection (must be public)
  const { data: collectionRaw } = await supabase
    .from('collections')
    .select('*, users(username, avatar_url)')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!collectionRaw) notFound()

  const collection = collectionRaw as typeof collectionRaw & {
    users: { username: string; avatar_url: string | null } | null
  }

  // Fetch words in the collection
  const { data: collectionWordsRaw } = await supabase
    .from('collection_words')
    .select('word_id, words(*)')
    .eq('collection_id', id)
    .order('added_at', { ascending: false })

  const words = ((collectionWordsRaw ?? []) as unknown as Array<{ word_id: string; words: Word }>)
    .map((cw) => cw.words)
    .filter(Boolean)

  // If logged in, fetch user's collections (default first)
  let userCollections: { id: string; name: string; is_default: boolean }[] | null = null
  if (user) {
    const { data } = await supabase
      .from('collections')
      .select('id, name, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
    userCollections = data ?? []
  }

  const sourceLangLabel =
    SUPPORTED_LANGUAGES[collection.source_lang as keyof typeof SUPPORTED_LANGUAGES] ?? collection.source_lang
  const targetLangLabel =
    SUPPORTED_LANGUAGES[collection.target_lang as keyof typeof SUPPORTED_LANGUAGES] ?? collection.target_lang

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/catalog"
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground mt-1 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{collection.name}</h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mt-1">
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{sourceLangLabel} → {targetLangLabel}</span>
            {collection.users?.username && (
              <>
                <span>·</span>
                <Link
                  href={`/profile/${collection.users.username}`}
                  className="hover:underline"
                >
                  @{collection.users.username}
                </Link>
              </>
            )}
            <span>·</span>
            <span>{t('wordsCount', { count: words.length })}</span>
          </div>
          {collection.description && (
            <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
          )}
        </div>
      </div>

      {/* Words table */}
      <PublicWordsTable
        words={words}
        userCollections={userCollections}
        collectionSourceLang={collection.source_lang}
        collectionTargetLang={collection.target_lang}
      />
    </div>
  )
}
