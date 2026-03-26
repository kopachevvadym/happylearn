import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

const collectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  source_lang: z.string().min(2),
  target_lang: z.string().min(2),
  is_public: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('collections')
    .select('*')
    .eq('user_id', userId!)
    .order('created_at', { ascending: false })

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data)
}

export async function POST(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON') }

  const parsed = collectionSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Validation error')

  const { data, error: dbError } = await supabase!
    .from('collections')
    .insert({ user_id: userId!, ...parsed.data })
    .select()
    .single()

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(data, 201)
}
