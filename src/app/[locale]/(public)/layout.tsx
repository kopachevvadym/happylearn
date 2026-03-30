import { PublicHeader } from '@/components/shared/public-header'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      {children}
    </div>
  )
}
