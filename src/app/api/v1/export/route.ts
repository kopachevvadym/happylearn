import { type NextRequest } from 'next/server'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('words')
    .select('word, translations, examples, source_lang, target_lang')
    .eq('user_id', userId!)
    .order('created_at', { ascending: false })

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data)
}
