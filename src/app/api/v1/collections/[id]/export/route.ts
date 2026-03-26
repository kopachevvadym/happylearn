import { type NextRequest } from 'next/server'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { id } = await params

  const { data: col } = await supabase!
    .from('collections')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', userId!)
    .single()

  if (!col) return apiError('Not found', 404)

  const { data: cws } = await supabase!
    .from('collection_words')
    .select('words(word, translations, examples, source_lang, target_lang)')
    .eq('collection_id', id)

  const words = (cws as unknown as { words: Record<string, unknown> | null }[])
    ?.map((cw) => cw.words)
    .filter(Boolean) ?? []

  return apiSuccess({ collection: col.name, words })
}
