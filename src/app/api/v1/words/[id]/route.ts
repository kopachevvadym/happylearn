import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

const updateSchema = z.object({
  word: z.string().min(1).optional(),
  translations: z.array(z.string().min(1)).min(1).optional(),
  examples: z.array(z.string()).optional(),
  source_lang: z.string().min(2).optional(),
  target_lang: z.string().min(2).optional(),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON') }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Validation error')

  const { data, error: dbError } = await supabase!
    .from('words')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', userId!)
    .select()
    .single()

  if (dbError) return apiError(dbError.message, 500)
  if (!data) return apiError('Not found', 404)
  return apiSuccess(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { id } = await params
  const { error: dbError } = await supabase!
    .from('words')
    .delete()
    .eq('id', id)
    .eq('user_id', userId!)

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess({ success: true })
}
