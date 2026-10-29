import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageShell } from '../components/layout/PageHeader'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <PageShell className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <p className="label-eyebrow">404</p>
        <h1 className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-ink">
          This page does not exist
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink-3">
          The page you are looking for was moved or never existed in this workspace.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button variant="primary" icon={<ArrowRight size={14} />}>
            Back to overview
          </Button>
        </Link>
      </div>
    </PageShell>
  )
}
