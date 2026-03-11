"use client";

import React from "react";
import * as ReactTable from "@tanstack/react-table";
import * as Table from "components/ui/table";
import { Skeleton } from "components/ui/skeleton";
import { Button } from "components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SortableTableProps<T> {
  tableCaption: string;
  data: T[];
  columns: ReactTable.ColumnDef<T, { accessorKey: string }>[];
  noResultsMessage?: string;
  loading?: boolean;
  initialSort?: ReactTable.SortingState;
  pageSize?: number;
}

export function SortableTable<T>({
  tableCaption,
  data,
  columns,
  noResultsMessage = "Keine Ergebnisse gefunden.",
  loading = false,
  initialSort,
  pageSize = 20,
}: SortableTableProps<T>) {
  // @ts-expect-error accessorKey exist
  const id = columns[0].accessorKey;

  const [sorting, setSorting] = React.useState<ReactTable.SortingState>(
    initialSort ?? [{ id, desc: true }]
  );

  const [pagination, setPagination] = React.useState<ReactTable.PaginationState>(
    { pageIndex: 0, pageSize }
  );

  const table = ReactTable.useReactTable({
    data: data,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: ReactTable.getCoreRowModel(),
    getSortedRowModel: ReactTable.getSortedRowModel(),
    getPaginationRowModel: ReactTable.getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();

  function RenderRows() {
    const rows = table.getRowModel().rows;

    if (rows.length === 0) {
      return (
        <Table.TableRow>
          <Table.TableCell
            colSpan={table.getAllColumns().length}
            className="h-20 text-center text-sm text-muted-foreground"
          >
            {noResultsMessage}
          </Table.TableCell>
        </Table.TableRow>
      );
    }

    const emptyRowCount = pageCount > 1 ? pageSize - rows.length : 0;

    return (
      <>
        {rows.map((row) => (
          <Table.TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Table.TableCell key={cell.id}>
                {ReactTable.flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext()
                )}
              </Table.TableCell>
            ))}
          </Table.TableRow>
        ))}
        {Array.from({ length: emptyRowCount }).map((_, i) => (
          <Table.TableRow key={`empty-${i}`}>
            <Table.TableCell
              colSpan={table.getAllColumns().length}
              className="h-[49px]"
            >
              &nbsp;
            </Table.TableCell>
          </Table.TableRow>
        ))}
      </>
    );
  }

  return (
    <>
      <Table.Table className="mt-4">
        <Table.TableCaption>{tableCaption}</Table.TableCaption>
        <Table.TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : ReactTable.flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </Table.TableHead>
              ))}
            </Table.TableRow>
          ))}
        </Table.TableHeader>

        <Table.TableBody>
          {loading ? (
            <LoadingRows length={5} currentRowCount={columns.length} />
          ) : (
            <RenderRows />
          )}
        </Table.TableBody>
      </Table.Table>

      {pageCount > 1 && (
        <Pagination
          currentPage={pagination.pageIndex}
          pageCount={pageCount}
          onPageChange={(page) =>
            setPagination((prev) => ({ ...prev, pageIndex: page }))
          }
        />
      )}
    </>
  );
}

function Pagination({
  currentPage,
  pageCount,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const pages = React.useMemo(() => {
    const items: (number | "ellipsis")[] = [];

    if (pageCount <= 7) {
      for (let i = 0; i < pageCount; i++) items.push(i);
      return items;
    }

    // Always show first page
    items.push(0);

    if (currentPage > 2) {
      items.push("ellipsis");
    }

    // Pages around current
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(pageCount - 2, currentPage + 1);
    for (let i = start; i <= end; i++) {
      items.push(i);
    }

    if (currentPage < pageCount - 3) {
      items.push("ellipsis");
    }

    // Always show last page
    items.push(pageCount - 1);

    return items;
  }, [currentPage, pageCount]);

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <Button
        variant="ghost"
        size="icon"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, idx) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="icon"
            onClick={() => onPageChange(page)}
          >
            {page + 1}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="icon"
        disabled={currentPage === pageCount - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LoadingRows({
  length,
  currentRowCount,
}: {
  length: number;
  currentRowCount: number;
}) {
  const placeholders = Array.from({ length });
  const cells = Array.from({ length: currentRowCount });
  return (
    <>
      {placeholders.map((_, index) => (
        <Table.TableRow key={index}>
          {cells.map((_, subIndex) => (
            <Table.TableCell key={`skeleton-cell-${index}-${subIndex}`}>
              <Skeleton className="h-4 w-full" />
            </Table.TableCell>
          ))}
        </Table.TableRow>
      ))}
    </>
  );
}
