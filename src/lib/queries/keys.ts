// Query key factories — no 'use client', safe to import in both server and client components

export const wordsKeys = {
  all: (userId: string) => ['words', userId] as const,
  list: (userId: string) => ['words', userId, 'list'] as const,
  progress: (userId: string) => ['words', userId, 'progress'] as const,
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
