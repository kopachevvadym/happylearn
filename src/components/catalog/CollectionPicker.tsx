'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'

interface Collection {
  id: string
  name: string
  is_default: boolean
}

interface CollectionPickerProps {
  collections: Collection[]
  selectedId: string
  onSelect: (id: string) => void
  onCreateNew: () => void
  labelAddToCollection: string
  labelMyDictionary: string
  labelCreateNew: string
}

export function CollectionPicker({
  collections,
  selectedId,
  onSelect,
  onCreateNew,
  labelAddToCollection,
  labelMyDictionary,
  labelCreateNew,
}: CollectionPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedCollection = collections.find((c) => c.id === selectedId)
  const displayName = selectedCollection
    ? selectedCollection.is_default ? labelMyDictionary : selectedCollection.name
    : labelAddToCollection

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-9 px-3 border border-input rounded-lg text-sm hover:bg-accent transition-colors"
      >
        <span className="max-w-[140px] truncate">{displayName}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-56 bg-popover border border-border rounded-xl shadow-lg py-1 z-50">
          {collections.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => { onSelect(col.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              {col.id === selectedId
                ? <Check className="w-4 h-4 text-primary flex-shrink-0" />
                : <span className="w-4 flex-shrink-0" />}
              <span className="truncate">{col.is_default ? labelMyDictionary : col.name}</span>
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              type="button"
              onClick={() => { onCreateNew(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left text-primary"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>{labelCreateNew}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
