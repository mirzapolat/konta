import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn(
      'inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin',
      className
    )} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex h-full min-h-48 items-center justify-center">
      <Spinner className="w-6 h-6 text-gray-400" />
    </div>
  )
}
