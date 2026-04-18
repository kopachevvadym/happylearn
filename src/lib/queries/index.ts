// Keys are safe to import in server and client components
export { wordsKeys, collectionsKeys, profileKeys } from './keys'

// Hooks — client-only ('use client' inside each file)
export { useWords, useWordProgress } from './words'
export { useOwnCollections, useOwnCollectionsSimple, useFollowedCollections } from './collections'
export { useProfile, useProfileLangs } from './user'
