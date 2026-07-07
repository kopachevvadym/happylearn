// Query key factories — no 'use client', safe to import in both server and client components

// Words per page for the timeline infinite query. Shared by the client hook and
// the dashboard's server-side prefetch so they stay in sync.
export const TIMELINE_PAGE_SIZE = 60

export const wordsKeys = {
  all: (userId: string) => ['words', userId] as const,
  list: (userId: string) => ['words', userId, 'list'] as const,
  progress: (userId: string) => ['words', userId, 'progress'] as const,
  timeline: (userId: string) => ['words', userId, 'timeline'] as const,
}

export const collectionsKeys = {
  all: (userId: string) => ['collections', userId] as const,
  own: (userId: string) => ['collections', userId, 'own'] as const,
  ownSimple: (userId: string) => ['collections', userId, 'own-simple'] as const,
  followed: (userId: string) => ['collections', userId, 'followed'] as const,
  detail: (userId: string, id: string) => ['collections', userId, 'detail', id] as const,
  detailWords: (userId: string, id: string) => ['collections', userId, 'detail', id, 'words'] as const,
}

export const profileKeys = {
  all: (userId: string) => ['profile', userId] as const,
  detail: (userId: string) => ['profile', userId, 'detail'] as const,
  langs: (userId: string) => ['profile', userId, 'langs'] as const,
}
