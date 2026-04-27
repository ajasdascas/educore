# SKILL: Tables & Data Grids — EduCore
# Stack: TanStack Table v8 + TanStack Virtual + shadcn/ui + Framer Motion
# Fuente: Investigación producción 2025/2026

---

## 🎯 CUÁNDO USAR QUÉ

| Escenario | Solución |
|-----------|---------|
| < 100 filas (grupos, materias) | TanStack Table simple + paginación server-side |
| 100-1000 filas (alumnos, asistencias) | TanStack Table + paginación cliente |
| > 1000 filas (historial, reportes) | TanStack Table + **Virtualización** |
| Read-only sin interacción | `<table>` HTML semántico con shadcn styles |

---

## 📦 INSTALACIÓN

```bash
npm install @tanstack/react-table @tanstack/react-virtual
```

---

## 🏗️ PATRÓN BASE — DataTable Reutilizable

```tsx
// components/modules/shared/data-table.tsx
'use client'
import {
  ColumnDef, flexRender, getCoreRowModel,
  getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, useReactTable,
  SortingState, ColumnFiltersState
} from '@tanstack/react-table'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  isLoading?: boolean
  onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns, data, searchKey, searchPlaceholder = 'Buscar...',
  isLoading, onRowClick
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 20 } }
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchKey && (
        <Input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
          onChange={e => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="bg-muted/40 hover:bg-muted/40">
                {hg.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="font-semibold text-foreground"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-1.5 select-none">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-muted-foreground">
                          {{ asc: <ChevronUp className="h-3.5 w-3.5" />,
                             desc: <ChevronDown className="h-3.5 w-3.5" />
                          }[header.column.getIsSorted() as string] ?? <ChevronsUpDown className="h-3.5 w-3.5" />}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-40 text-center text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence initial={false}>
                {table.getRowModel().rows.map((row, i) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/30',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} resultado(s)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >Anterior</Button>
          <span className="text-sm flex items-center px-2 text-muted-foreground">
            Pág. {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <Button
            variant="outline" size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >Siguiente</Button>
        </div>
      </div>
    </div>
  )
}
```

---

## ⚡ TABLA CON VIRTUALIZACIÓN (para > 1000 filas)

```tsx
// components/modules/shared/virtual-data-table.tsx
// Usar para: historial de asistencias, reporte de calificaciones anuales
'use client'
import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'

export function VirtualDataTable<TData>({ data, columns, rowHeight = 48 }) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,  // renderiza 8 filas extra arriba/abajo del viewport
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  // Padding para simular filas no renderizadas
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0
    ? totalSize - virtualRows[virtualRows.length - 1].end
    : 0

  return (
    <div
      ref={tableContainerRef}
      className="overflow-auto rounded-xl border"
      style={{ height: '600px' }}  // altura fija — OBLIGATORIO para virtualización
    >
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-background border-b">
          {/* headers normales */}
        </thead>
        <tbody>
          {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
          {virtualRows.map(virtualRow => {
            const row = rows[virtualRow.index]
            return (
              <tr key={row.id} className="border-b hover:bg-muted/30">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
          {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 📋 DEFINICIÓN DE COLUMNAS — PATRONES ESPECÍFICOS

### Columna de alumno (con foto)
```tsx
const studentColumns: ColumnDef<Student>[] = [
  {
    id: 'student',
    header: 'Alumno',
    accessorFn: row => `${row.firstName} ${row.lastName}`,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.photoUrl} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {row.original.firstName[0]}{row.original.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.enrollmentNumber}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ getValue }) => {
      const status = getValue<string>()
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`students/${row.original.id}`}>Ver perfil</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Editar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
]
```

### Columna de calificación (con color semáforo)
```tsx
{
  accessorKey: 'score',
  header: 'Calificación',
  cell: ({ getValue }) => {
    const score = getValue<number | null>()
    if (score === null) return <span className="text-muted-foreground text-sm">—</span>

    const getColor = (s: number) => {
      if (s >= 9)   return 'text-emerald-700 bg-emerald-50 border-emerald-200'
      if (s >= 7)   return 'text-blue-700    bg-blue-50    border-blue-200'
      if (s >= 6)   return 'text-amber-700   bg-amber-50   border-amber-200'
      return             'text-red-700      bg-red-50      border-red-200'
    }

    return (
      <span className={cn('px-2 py-0.5 rounded-md border text-sm font-semibold', getColor(score))}>
        {score.toFixed(1)}
      </span>
    )
  }
}
```

---

## 🔍 BÚSQUEDA EN TIEMPO REAL — debounced

```tsx
import { useDebounce } from '@/lib/hooks/use-debounce'

function StudentSearch({ onSearch }: { onSearch: (term: string) => void }) {
  const [value, setValue] = useState('')
  const debouncedValue = useDebounce(value, 300)  // 300ms delay

  useEffect(() => {
    onSearch(debouncedValue)
  }, [debouncedValue])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Buscar alumno..."
        className="pl-9"
      />
    </div>
  )
}

// lib/hooks/use-debounce.ts
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}
```