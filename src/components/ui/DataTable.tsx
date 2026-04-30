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
import { Search, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const totalPages = Math.ceil(filteredAndSortedData.length / currentPageSize);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * currentPageSize,
    currentPage * currentPageSize
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Generate visible page numbers with ellipsis logic
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis-start');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('ellipsis-end');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        {searchKey ? (
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-9 text-sm bg-muted/30 border-border/60 focus:bg-background transition-colors"
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

        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-muted-foreground">Rows per page:</p>
          <Select
            value={currentPageSize.toString()}
            onValueChange={(value) => {
              setCurrentPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue placeholder={currentPageSize.toString()} />
            </SelectTrigger>
            <SelectContent side="bottom">
              {[5, 10, 15, 20, 25].map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
                        ? col.render(row, col, (currentPage - 1) * pageSize + i)
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

      {/* Pagination Tray */}
      {(totalPages > 1 || filteredAndSortedData.length > 5) && (
        <div className="flex items-center justify-between px-1 pt-4">
          <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
            Showing{" "}
            <span className="font-bold text-foreground">
              {Math.min((currentPage - 1) * currentPageSize + 1, filteredAndSortedData.length)}
            </span>
            –
            <span className="font-bold text-foreground">
              {Math.min(currentPage * currentPageSize, filteredAndSortedData.length)}
            </span>
            {" "}of{" "}
            <span className="font-bold text-foreground">{filteredAndSortedData.length}</span>
          </p>
          <Pagination className="justify-end w-auto mx-0">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    "cursor-pointer h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 select-none",
                    currentPage === 1 && "pointer-events-none opacity-40 cursor-not-allowed"
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
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "cursor-pointer h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all select-none flex items-center justify-center",
                        currentPage === page
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                    "cursor-pointer h-8 px-2.5 rounded-lg text-xs font-semibold gap-1 select-none",
                    currentPage === totalPages && "pointer-events-none opacity-40 cursor-not-allowed"
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
