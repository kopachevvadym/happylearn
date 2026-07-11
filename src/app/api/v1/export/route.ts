import { type NextRequest } from 'next/server'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

// PostgREST caps a single response at 1000 rows — page through with .range()
// so large vocabularies export completely instead of silently truncating.
const PAGE = 1000

export async function GET(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const all: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error: dbError } = await supabase!
      .from('words')
      .select('word, translations, examples, source_lang, target_lang')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE - 1)

    if (dbError) return apiError(dbError.message, 500)
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }

  return apiSuccess(all)
}
