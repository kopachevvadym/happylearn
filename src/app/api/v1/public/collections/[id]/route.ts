import { type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, description, source_lang, target_lang, users(username), collection_words(word_id, words(word, translations, examples, source_lang, target_lang))')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !data) return apiError('Not found', 404)
  return apiSuccess(data)
}
