import { createHash } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Validates Bearer API key and returns the admin supabase client + userId.
 * Uses the service-role client to bypass RLS (no session cookie in API requests).
 */
export async function authenticateApiKey(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      supabase: null,
      userId: null,
      error: NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 }),
    }
  }

  const key = authHeader.slice(7)
  const supabase = createAdminClient()

  // Keys are stored as SHA-256 hashes — a DB leak doesn't expose usable keys
  const keyHash = createHash('sha256').update(key).digest('hex')
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('user_id, id')
    .eq('key_hash', keyHash)
    .single()

  if (!apiKey) {
    return {
      supabase: null,
      userId: null,
      error: NextResponse.json({ error: 'Invalid API key' }, { status: 401 }),
    }
  }

  // A Supabase query builder only executes when awaited — a bare call is a
  // no-op, so last_used_at was never updated.
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)

  return { supabase, userId: apiKey.user_id, error: null }
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}
