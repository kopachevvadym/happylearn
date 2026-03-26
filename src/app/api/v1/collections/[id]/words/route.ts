import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

const addWordSchema = z.object({
  word_id: z.string().uuid(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON') }

  const parsed = addWordSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Validation error')

  // Verify collection ownership
  const { data: col } = await supabase!
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId!)
    .single()

  if (!col) return apiError('Collection not found', 404)

  const { data, error: dbError } = await supabase!
    .from('collection_words')
    .insert({ collection_id: id, word_id: parsed.data.word_id })
    .select()
    .single()

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data, 201)
}
