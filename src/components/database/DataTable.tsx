import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  searchable?: boolean
  searchFields?: (keyof T)[]
  selectable?: boolean
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  emptyDescription?: string
  headerActions?: React.ReactNode
  onDeleteSelected?: (ids: (string | number)[]) => void
  loading?: boolean
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  searchable = true,
  searchFields,
  selectable = true,
  onRowClick,
  actions,
  emptyMessage = 'No items',
  emptyDescription,
  headerActions,
  onDeleteSelected,
  loading,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string | number>>(new Set())

  const filtered = useMemo(() => {
    let rows = [...data]
    if (search) {
      const q = search.toLowerCase()
      const fields = searchFields || (columns.map(c => c.key) as (keyof T)[])
      rows = rows.filter(row =>
        fields.some(f => String(row[f] ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return rows
  }, [data, search, sortKey, sortDir, columns, searchFields])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r[keyField]))

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(r => r[keyField])))
    }
  }

  const toggleRow = (id: string | number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {searchable && (
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              prefix={<Search size={14} />}
            />
          </div>
        )}
        {selected.size > 0 && onDeleteSelected && (
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => { onDeleteSelected([...selected]); setSelected(new Set()) }}
          >
            Delete ({selected.size})
          </Button>
        )}
        {headerActions}
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {selectable && (
                  <th className="w-10 px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-3 py-2.5 text-left font-medium text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap',
                      col.sortable && 'cursor-pointer hover:text-gray-900 select-none',
                      col.headerClassName
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </span>
                  </th>
                ))}
                {actions && <th className="px-3 py-2.5 w-24" />}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-10 text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} className="text-center py-12">
                    <p className="text-gray-500 font-medium">{emptyMessage}</p>
                    {emptyDescription && <p className="text-gray-400 text-xs mt-1">{emptyDescription}</p>}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr
                    key={row[keyField]}
                    className={cn(
                      'border-b border-gray-100 last:border-0 transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-gray-50',
                      selected.has(row[keyField]) && 'bg-blue-50'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row[keyField])}
                          onChange={() => toggleRow(row[keyField])}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={cn('px-3 py-3 text-gray-700', col.className)}>
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
