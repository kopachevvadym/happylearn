'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const JSON_WORDS_EXAMPLE = `[
  {
    "word": "beautiful",
    "translations": ["гарний", "прекрасний"],
    "examples": ["She is beautiful.", "What a beautiful day!"],
    "source_lang": "en",
    "target_lang": "uk"
  }
]`

const CSV_WORDS_EXAMPLE = `word,translations,examples,source_lang,target_lang
beautiful,"гарний,прекрасний","She is beautiful.",en,uk`

const JSON_BACKUP_EXAMPLE = `[
  {
    "word": "beautiful",
    "translations": ["гарний", "прекрасний"],
    "examples": ["She is beautiful."],
    "source_lang": "en",
    "target_lang": "uk",
    "progress": {
      "ease_factor": 2.8,
      "interval": 6,
      "repetitions": 3,
      "next_review_at": "2026-04-05T00:00:00Z",
      "is_learned": false
    }
  }
]`

export function FormatPreview() {
  const t = useTranslations('Settings.importExport')
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{t('formatPreview')}</span>
        <ChevronDown
          className="w-4 h-4 text-muted-foreground transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <Tabs defaultValue="json-words">
            <TabsList className="w-auto">
              <TabsTrigger value="json-words">{t('formatJsonWords')}</TabsTrigger>
              <TabsTrigger value="csv-words">{t('formatCsvWords')}</TabsTrigger>
              <TabsTrigger value="json-backup">{t('formatJsonBackup')}</TabsTrigger>
            </TabsList>
            <TabsContent value="json-words">
              <CodeBlock code={JSON_WORDS_EXAMPLE} />
            </TabsContent>
            <TabsContent value="csv-words">
              <CodeBlock code={CSV_WORDS_EXAMPLE} />
            </TabsContent>
            <TabsContent value="json-backup">
              <CodeBlock code={JSON_BACKUP_EXAMPLE} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-4 py-3 text-xs leading-relaxed text-foreground">
      <code>{code}</code>
    </pre>
  )
}
