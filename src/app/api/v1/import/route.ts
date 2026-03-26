import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

const importSchema = z.array(
  z.object({
    word: z.string().min(1),
    translations: z.array(z.string().min(1)).min(1),
    examples: z.array(z.string()).optional().default([]),
    source_lang: z.string().min(2),
    target_lang: z.string().min(2),
  })
)

export async function POST(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON') }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Validation error')

  const { data, error: dbError } = await supabase!
    .from('words')
    .upsert(
      parsed.data.map((w) => ({ user_id: userId!, ...w })),
      { onConflict: 'user_id,word', ignoreDuplicates: false }
    )
    .select()

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess({ imported: data?.length ?? 0 }, 201)
}
