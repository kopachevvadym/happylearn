import { type NextRequest } from 'next/server'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { id } = await params
  const { data, error: dbError } = await supabase!
    .from('collections')
    .select('*, collection_words(word_id, words(*))')
    .eq('id', id)
    .eq('user_id', userId!)
    .single()

  if (dbError || !data) return apiError('Not found', 404)
  return apiSuccess(data)
}
