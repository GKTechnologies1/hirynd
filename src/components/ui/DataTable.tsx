import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey?: keyof T;
    render?: (row: T) => React.ReactNode;
    className?: string;
    sortable?: boolean;
  }[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  pageSize = 10,
  onRowClick,
  isLoading = false,
  emptyMessage = "No results found.",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof T | null; direction: 'asc' | 'desc' | null }>({ key: null, direction: null });

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  const filteredAndSortedData = React.useMemo(() => {
    let result = [...data];

    // Filter
    if (searchTerm && searchKey) {
      result = result.filter((item) => {
        const val = item[searchKey];
        if (typeof val === "string") {
          return val.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      });
    }

    // Sort
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchTerm, searchKey, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
              {columns.map((col, i) => {
                const isSortable = col.sortable && col.accessorKey;
                const isSorted = sortConfig.key === col.accessorKey;
                
                return (
                  <TableHead 
                    key={i} 
                    className={cn(
                      "h-10 px-4 text-left align-middle font-bold text-muted-foreground [&:has([role=checkbox])]:pr-0",
                      col.className,
                      isSortable && "cursor-pointer select-none transition-colors hover:text-foreground"
                    )}
                    onClick={() => isSortable && handleSort(col.accessorKey!)}
                  >
                    <div className="flex items-center gap-2">
                       {col.header}
                       {isSortable && (
                         <div className="flex flex-col opacity-40 group-hover:opacity-100">
                           {isSorted && sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-secondary" /> : 
                            isSorted && sortConfig.direction === 'desc' ? <ArrowDown className="h-3 w-3 text-secondary" /> :
                            <ArrowUpDown className="h-3 w-3" />}
                         </div>
                       )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, i) => (
                <TableRow
                  key={i}
                  className={cn(
                    "group border-b last:border-0 transition-colors hover:bg-muted/30",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col, j) => (
                    <TableCell key={j} className={cn("px-4 py-3 align-middle", col.className)}>
                      {col.render
                        ? col.render(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as React.ReactNode)
                        : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedData.length)}–{Math.min(currentPage * pageSize, filteredAndSortedData.length)} of {filteredAndSortedData.length}
            </p>
          <Pagination className="justify-end w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "cursor-pointer h-8 w-8 p-0 rounded-lg",
                    currentPage === 1 && "pointer-events-none opacity-50 cursor-not-allowed"
                  )}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, i, arr) => (
                    <React.Fragment key={p}>
                        {i > 0 && arr[i-1] !== p - 1 && (
                            <PaginationItem><span className="px-2 text-muted-foreground">...</span></PaginationItem>
                        )}
                        <PaginationItem>
                            <PaginationLink
                                isActive={currentPage === p}
                                onClick={() => setCurrentPage(p)}
                                className={cn(
                                    "cursor-pointer h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all",
                                    currentPage === p ? "bg-secondary text-secondary-foreground shadow-sm" : "hover:bg-muted"
                                )}
                            >
                                {p}
                            </PaginationLink>
                        </PaginationItem>
                    </React.Fragment>
                ))
              }

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                     "cursor-pointer h-8 w-8 p-0 rounded-lg",
                     currentPage === totalPages && "pointer-events-none opacity-50 cursor-not-allowed"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
