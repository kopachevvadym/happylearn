import { type NextRequest } from 'next/server'
import { authenticateApiKey, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(request: NextRequest) {
  const { supabase, userId, error } = await authenticateApiKey(request)
  if (error) return error

  const { data, error: dbError } = await supabase!
    .from('users')
    .select('id, username, display_role, bio, default_source_lang, default_target_lang, daily_goal, created_at')
    .eq('id', userId!)
    .single()

  if (dbError || !data) return apiError('User not found', 404)
  return apiSuccess(data)
}
