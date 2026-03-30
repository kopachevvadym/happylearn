'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { checkWordDuplicates, addWordsToCollection } from '@/app/actions/words'
import { createCollection } from '@/app/actions/collections'
import { CollectionPicker } from './CollectionPicker'
import { CollectionForm } from '@/components/collections/collection-form'

interface Collection {
  id: string
  name: string
  is_default: boolean
}

interface AddWordsBarProps {
  selectedWordIds: string[]
  collections: Collection[]
  onSuccess: () => void
  collectionSourceLang: string
  collectionTargetLang: string
}

export function AddWordsBar({
  selectedWordIds,
  collections: initialCollections,
  onSuccess,
  collectionSourceLang,
  collectionTargetLang,
}: AddWordsBarProps) {
  const t = useTranslations('CollectionPage')
  const [collections, setCollections] = useState(initialCollections)
  const [selectedColId, setSelectedColId] = useState(
    initialCollections.find((c) => c.is_default)?.id ?? initialCollections[0]?.id ?? ''
  )
  const [showConfirm, setShowConfirm] = useState(false)
  const [checkResult, setCheckResult] = useState<{ toAdd: number; toSkip: number } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const count = selectedWordIds.length

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const doAdd = async () => {
    const result = await addWordsToCollection(selectedWordIds, selectedColId)
    if ('error' in result) return
    showToast(t('addedToast', { count: result.added, collection: result.collectionName ?? '' }))
    setShowConfirm(false)
    onSuccess()
  }

  const handleAddClick = () => {
    if (!selectedColId) return
    startTransition(async () => {
      const result = await checkWordDuplicates(selectedWordIds, selectedColId)
      if ('error' in result) return
      if (result.toSkip > 0) {
        setCheckResult(result)
        setShowConfirm(true)
      } else {
        await doAdd()
      }
    })
  }

  const handleConfirmAdd = () => {
    startTransition(async () => {
      await doAdd()
    })
  }

  const handleCreateCollection = async (formData: FormData) => {
    const result = await createCollection(formData)
    if (result.error) return { error: result.error }
    if (result.data) {
      const newCol = { id: result.data.id, name: result.data.name, is_default: false }
      setCollections((prev) => [...prev, newCol])
      setSelectedColId(newCol.id)
      setShowCreateForm(false)
    }
    return { success: true as const }
  }

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-card border border-border rounded-xl shadow-lg px-5 py-3">
          <span className="text-sm font-medium">{t('selected', { count })}</span>
          <div className="flex items-center gap-2">
            <CollectionPicker
              collections={collections}
              selectedId={selectedColId}
              onSelect={setSelectedColId}
              onCreateNew={() => setShowCreateForm(true)}
              labelAddToCollection={t('addToCollection')}
              labelMyDictionary={t('myDictionary')}
              labelCreateNew={t('createNew')}
            />
            <button
              type="button"
              onClick={handleAddClick}
              disabled={isPending || !selectedColId}
              className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {t('add')}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation modal for duplicates */}
      {showConfirm && checkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <p className="text-sm">
              {t('duplicateWarning', { added: checkResult.toAdd, skipped: checkResult.toSkip })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-10 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={isPending}
                className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {t('addNew')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create collection modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-4 max-w-md w-full shadow-xl">
            <CollectionForm
              defaultSourceLang={collectionSourceLang}
              defaultTargetLang={collectionTargetLang}
              onSubmit={handleCreateCollection}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm px-4 py-2 rounded-lg shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  )
}
