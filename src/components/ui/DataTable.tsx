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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ServerPaginationConfig {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessorKey?: keyof T;
    render?: (row: T, col?: any, globalIndex?: number) => React.ReactNode;
    className?: string;
    sortable?: boolean;
  }[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  serverPagination?: ServerPaginationConfig;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  pageSize = 5,
  onRowClick,
  isLoading = false,
  emptyMessage = "No results found.",
  serverPagination,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [currentPageSize, setCurrentPageSize] = React.useState(pageSize);
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

  const isServer = Boolean(serverPagination);
  const activePage = isServer ? serverPagination!.page : currentPage;
  const activePageSize = isServer ? serverPagination!.pageSize : currentPageSize;
  const activeTotal = isServer ? serverPagination!.totalCount : filteredAndSortedData.length;

  const totalPages = Math.max(1, Math.ceil(activeTotal / activePageSize));
  const paginatedData = isServer
    ? data
    : filteredAndSortedData.slice(
        (currentPage - 1) * currentPageSize,
        currentPage * currentPageSize
      );

  const handlePageChange = (p: number) => {
    if (isServer) {
      serverPagination!.onPageChange(p);
    } else {
      setCurrentPage(p);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (isServer) {
      serverPagination!.onPageSizeChange?.(size);
      serverPagination!.onPageChange(1);
    } else {
      setCurrentPageSize(size);
      setCurrentPage(1);
    }
  };

  React.useEffect(() => {
    if (!isServer) {
      setCurrentPage(1);
    }
  }, [searchTerm, isServer]);

  // Generate visible page numbers with ellipsis logic
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (activePage > 3) pages.push('ellipsis-start');
      
      const start = Math.max(2, activePage - 1);
      const end = Math.min(totalPages - 1, activePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (activePage < totalPages - 2) pages.push('ellipsis-end');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-muted/10">
        {searchKey ? (
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-background border-border/60 focus:bg-background transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : <div />}

        <div className="flex items-center gap-2 ml-auto">
          <p className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Rows per page:</p>
          <Select
            value={activePageSize.toString()}
            onValueChange={(value) => {
              handlePageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs px-2.5 py-1 flex items-center justify-between rounded-lg border border-input bg-background shadow-sm focus:ring-1 focus:ring-primary">
              <SelectValue placeholder={activePageSize.toString()} />
            </SelectTrigger>
            <SelectContent side="bottom" align="end" className="min-w-[72px] z-[10001]">
              {[5, 10, 15, 20, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs py-1.5 pl-7 pr-2 cursor-pointer font-medium">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
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
                      "h-10 px-4 text-center align-middle font-bold text-muted-foreground [&:has([role=checkbox])]:pr-0",
                      col.className,
                      isSortable && "group cursor-pointer select-none transition-colors hover:text-foreground"
                    )}
                    onClick={() => isSortable && handleSort(col.accessorKey!)}
                  >
                    <div className="flex items-center justify-center gap-2">
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
              Array.from({ length: activePageSize || 5 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`} className="border-b last:border-0 hover:bg-transparent">
                  {columns.map((col, colIndex) => (
                    <TableCell key={`skeleton-col-${colIndex}`} className={cn("px-4 py-3.5 text-center align-middle", col.className)}>
                      <div className="flex items-center justify-center">
                        <Skeleton className={cn(
                          "h-4 rounded-md bg-slate-200/80 animate-pulse",
                          colIndex === 0 ? "w-28" :
                          colIndex === 1 ? "w-36" :
                          colIndex === 10 ? "w-44" :
                          colIndex === 11 ? "w-20" : "w-16"
                        )} />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
                    <TableCell key={j} className={cn("px-4 py-3 text-center align-middle", col.className)}>
                      <div className="flex items-center justify-center">
                      {col.render
                        ? col.render(row, col, (activePage - 1) * activePageSize + i)
                        : col.accessorKey
                        ? (row[col.accessorKey] as React.ReactNode)
                        : "—"}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Tray */}
      {(totalPages > 1 || activeTotal > 5) && (
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/60 bg-muted/10">
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
            Showing{" "}
            <span className="font-bold text-foreground">
              {activeTotal === 0 ? 0 : (activePage - 1) * activePageSize + 1}
            </span>
            –
            <span className="font-bold text-foreground">
              {Math.min(activePage * activePageSize, activeTotal)}
            </span>
            {" "}of{" "}
            <span className="font-bold text-foreground">{activeTotal}</span>
          </p>
          <Pagination className="justify-end w-auto mx-0">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, activePage - 1))}
                  className={cn(
                    "cursor-pointer h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 select-none",
                    activePage === 1 && "pointer-events-none opacity-40 cursor-not-allowed"
                  )}
                />
              </PaginationItem>

              {getVisiblePages().map((page, idx) => {
                if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                  return (
                    <PaginationItem key={page}>
                      <span className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground select-none">
                        ···
                      </span>
                    </PaginationItem>
                  );
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={activePage === page}
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        "cursor-pointer h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all select-none flex items-center justify-center",
                        activePage === page
                          ? "bg-secondary text-secondary-foreground shadow-sm"
                          : "hover:bg-muted"
                      )}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, activePage + 1))}
                  className={cn(
                    "cursor-pointer h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 select-none",
                    activePage === totalPages && "pointer-events-none opacity-40 cursor-not-allowed"
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
