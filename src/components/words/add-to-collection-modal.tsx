'use client'

import { useState, useTransition, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

interface AddToCollectionModalProps {
  wordId: string
  collections: { id: string; name: string }[]
  onSubmit: (collectionIds: string[]) => Promise<void>
  onClose: () => void
}

export function AddToCollectionModal({ collections, onSubmit, onClose }: AddToCollectionModalProps) {
  const t = useTranslations('words')
  const tCommon = useTranslations('common')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = () => {
    if (!selected.size) return
    startTransition(async () => {
      await onSubmit(Array.from(selected))
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-collection-title"
        className="bg-card border border-border rounded-xl w-full max-w-sm shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 id="add-to-collection-title" className="font-semibold">{t('add_to_collection')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={tCommon('cancel')}
            className="p-1.5 hover:bg-accent rounded-lg"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {collections.map((col) => (
            <label key={col.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(col.id)}
                onChange={() => toggle(col.id)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">{col.name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !selected.size}
            aria-busy={isPending}
            className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? tCommon('loading') : tCommon('add')}
          </button>
        </div>
      </div>
    </div>
  )
}
