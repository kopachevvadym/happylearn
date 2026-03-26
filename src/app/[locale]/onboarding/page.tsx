import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/shared/onboarding-wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed, username')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">happylearn</h1>
          <p className="text-muted-foreground mt-1">
            Ласкаво просимо, {profile?.username ?? ''}!
          </p>
        </div>
        <OnboardingWizard />
      </div>
    </div>
  )
}
