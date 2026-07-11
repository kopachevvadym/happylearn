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
).max(5000)

export async function POST(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON') }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Validation error')
  if (!parsed.data.length) return apiSuccess({ imported: 0, skipped: 0 }, 201)

  // words has no unique(user_id, word) constraint, so upsert-onConflict cannot
  // work — dedupe against existing rows (and within the payload) manually.
  const { data: existing, error: fetchError } = await supabase!
    .from('words')
    .select('word, source_lang, target_lang')
    .eq('user_id', userId!)
    .in('word', parsed.data.map((w) => w.word))

  if (fetchError) return apiError(fetchError.message, 500)

  const keyOf = (w: { word: string; source_lang: string; target_lang: string }) =>
    `${w.word.trim().toLowerCase()}__${w.source_lang}__${w.target_lang}`

  const seen = new Set((existing ?? []).map(keyOf))
  const toInsert: typeof parsed.data = []
  for (const w of parsed.data) {
    const key = keyOf(w)
    if (seen.has(key)) continue
    seen.add(key)
    toInsert.push(w)
  }

  if (!toInsert.length) {
    return apiSuccess({ imported: 0, skipped: parsed.data.length }, 201)
  }

  const { data, error: dbError } = await supabase!
    .from('words')
    .insert(toInsert.map((w) => ({ user_id: userId!, ...w, word: w.word.trim() })))
    .select('id')

  if (dbError) return apiError(dbError.message, 500)
  return apiSuccess(
    { imported: data?.length ?? 0, skipped: parsed.data.length - toInsert.length },
    201
  )
}
