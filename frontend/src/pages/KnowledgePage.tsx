import { useState } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { api, ApiError } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { PageHeader, PageShell } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Card, ErrorState, SkeletonRows } from '../components/ui/StateBlocks'
import type { KnowledgeCategory } from '../lib/types'

export function KnowledgePage() {
  const { notify } = useToast()
  const { data, loading, error, reload } = useApi<{ categories: KnowledgeCategory[] }>('/api/knowledge')
  const [adding, setAdding] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('services')
  const [busy, setBusy] = useState(false)

  const addItem = async () => {
    if (!title.trim() || !content.trim()) return
    setBusy(true)
    try {
      await api.post('/api/knowledge', {
        category,
        title: title.trim(),
        content: content.trim(),
      })
      notify({ tone: 'success', title: 'Knowledge updated', detail: 'Future missions will use this context.' })
      setTitle('')
      setContent('')
      setAdding(null)
      void reload(true)
    } catch (err) {
      notify({
        tone: 'error',
        title: 'Could not save',
        detail: err instanceof ApiError ? err.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  const removeItem = async (id: string) => {
    try {
      await api.del(`/api/knowledge/${id}`)
      notify({ tone: 'info', title: 'Item removed' })
      void reload(true)
    } catch {
      notify({ tone: 'error', title: 'Could not remove the item' })
    }
  }

  const categories = data?.categories ?? []

  return (
    <PageShell>
      <PageHeader
        eyebrow="Context"
        title="Knowledge"
        subtitle="The persistent business context the Operator uses when it plans and writes. Every future mission inherits it."
      />

      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <div className="surface">
          <ErrorState
            title="Knowledge could not be loaded"
            description={error.message}
            onRetry={() => reload()}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((group) => (
            <Card key={group.key} className="flex flex-col">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div>
                  <p className="label-eyebrow">{group.label}</p>
                  {group.key === 'profile' ? (
                    <p className="mt-1.5 text-[15px] font-semibold tracking-[-0.015em] text-ink">
                      {group.items[0]?.content ?? '—'}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  icon={<Plus size={13} />}
                  onClick={() => {
                    setAdding(adding === group.key ? null : group.key)
                    setCategory(group.key)
                  }}
                >
                  Add
                </Button>
              </div>

              {adding === group.key ? (
                <div className="space-y-3 border-b border-line bg-surface-2/50 px-5 py-4">
                  <Field label="Title">
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Service"
                    />
                  </Field>
                  <Field label="Content">
                    <Textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      rows={2}
                      placeholder="AI Automation"
                    />
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" loading={busy} onClick={addItem}>
                      Save item
                    </Button>
                    <Button variant="quiet" size="sm" onClick={() => setAdding(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              <ul className="divide-y divide-line">
                {group.items.map((item) => (
                  <li key={item.id} className="group flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink-2">{item.content}</p>
                      {group.key !== 'profile' ? (
                        <p className="mt-0.5 text-[11px] text-ink-4">{item.title}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded p-1 text-ink-4 opacity-0 transition-opacity hover:text-critical group-hover:opacity-100"
                      aria-label={`Remove ${item.content}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
                {group.items.length === 0 ? (
                  <li className="px-5 py-4 text-[12px] text-ink-4">
                    Nothing recorded yet. Add context so the Operator speaks as your business.
                  </li>
                ) : null}
              </ul>
            </Card>
          ))}

          <Card className="md:col-span-2 p-5">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-accent" />
              <p className="label-eyebrow">How knowledge is used</p>
            </div>
            <p className="mt-2.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-3">
              The Planner uses your ideal customers to set the search strategy. The Writer uses your
              services and communication style so every message sounds like your business rather
              than a template. The Reviewer checks drafts against the operating rules recorded
              here.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-[190px]"
                aria-label="Category"
              >
                {categories.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => setAdding(adding ? null : category)}
              >
                Add to {categories.find((group) => group.key === category)?.label ?? 'section'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  )
}
