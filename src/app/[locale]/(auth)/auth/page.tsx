import { Suspense } from 'react'
import { AuthTabs } from '@/components/shared/auth-tabs'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">happylearn</h1>
          <p className="text-muted-foreground mt-1">Learn words with joy</p>
        </div>
        <Suspense>
          <AuthTabs />
        </Suspense>
      </div>
    </div>
  )
}
