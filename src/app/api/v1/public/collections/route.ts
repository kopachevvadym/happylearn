import { type NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const supabase = await createClient()

  let query = supabase
    .from('collections')
    .select('id, name, description, source_lang, target_lang, users(username), collection_words(count), collection_follows(count)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (lang) {
    query = query.or(`source_lang.eq.${lang},target_lang.eq.${lang}`)
  }

  const { data, error } = await query
  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}
