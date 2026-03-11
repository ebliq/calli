import { Column } from "@tanstack/react-table";
import { Button } from "../ui/button";
import * as Icon from "lucide-react";
export function SortableColumnHeader<T>({
  column,
  title,
  isMultiSort = true,
}: {
  column: Column<T, unknown>;
  title: string;
  isMultiSort?: boolean;
}) {
  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className=""
      onClick={() => column.toggleSorting(isSorted === "asc", isMultiSort)}
    >
      {isSorted === "asc" && <Icon.AArrowUpIcon className="h-3 w-3" />}
      {isSorted === "desc" && <Icon.AArrowDownIcon className="h-3 w-3" />}
      {isSorted === false && <Icon.ArrowUpDown className="h-3 w-3" />}
      {title}
    </Button>
  );
}
