'use client'

import { useOwnCollections, useFollowedCollections, useProfileLangs } from '@/lib/queries'
import { CollectionsList } from '@/components/collections/collections-list'

interface CollectionsContentProps {
  userId: string
  title: string
}

export function CollectionsContent({ userId, title }: CollectionsContentProps) {
  const { data: ownCollections = [] } = useOwnCollections(userId)
  const { data: followedCollections = [] } = useFollowedCollections(userId)
  const { data: profile } = useProfileLangs(userId)

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <CollectionsList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ownCollections={ownCollections as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        followedCollections={followedCollections as any}
        defaultSourceLang={profile?.default_source_lang ?? 'en'}
        defaultTargetLang={profile?.default_target_lang ?? 'uk'}
      />
    </div>
  )
}
