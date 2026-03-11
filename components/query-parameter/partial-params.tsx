"use client";

import { useSearchParams } from "next/navigation";

export function UsePartialParams<T extends string>(
  searchParamsKey: T[]
): {
  queryParams: Record<T, string | undefined>;
} {
  const searchParams = useSearchParams();
  const queryParams = {} as Record<T, string>;

  if (searchParams) {
    searchParamsKey.forEach((key) => {
      const val = searchParams.get(key);
      if (val !== null) {
        queryParams[key] = val;
      }
    });
  }

  return {
    queryParams,
  };
}
