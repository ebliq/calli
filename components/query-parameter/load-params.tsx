"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "components/ui/card";
import { Button } from "components/ui/button";
import { AlertCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function UseLoadParams<T extends string>(
  searchParamsKey: T[]
): {
  queryParams: Record<T, string>;
  hasMissingParams: boolean;
  missingParams: string[];
  restParams: Record<string, string>;
} {
  const searchParams = useSearchParams();
  const queryParams = {} as Record<T, string>;
  const missingParams: string[] = [];
  const restParams: Record<string, string> = {};

  if (searchParams) {
    searchParamsKey.forEach((key) => {
      const val = searchParams.get(key);
      if (val !== null) {
        queryParams[key] = val;
      } else {
        missingParams.push(key);
      }
    });

    searchParams
      .keys()
      .filter((x) => !searchParamsKey.includes(x as T))
      .forEach((element) => {
        restParams[element] = searchParams.get(element) || "";
      });
  }

  const hasMissingParams = missingParams.length > 0;

  return {
    queryParams,
    hasMissingParams,
    missingParams,
    restParams,
  };
}

export function MissingParamsPage({
  missingParams,
}: {
  missingParams: string[];
}) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Link href={"/patienten"}>
        <Button>
          <ArrowLeft className="h-4 w-4" />
          Patientenübersicht
        </Button>
      </Link>
      <Card className="w-full max-w-md mx-auto mt-8 overflow-hidden">
        <CardHeader className="bg-red-500 text-white">
          <CardTitle className="flex items-center text-lg font-semibold">
            <AlertCircle className="w-5 h-5 mr-2" />
            Fehlende Query Parameter
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-gradient-to-br from-red-50 to-red-100 p-6">
          <p className="text-sm text-red-800 mb-4">
            Die folgenden query parameters fehlen in der URL:
          </p>
          <div className="grid gap-3">
            {missingParams.map((param, index) => (
              <div
                key={param}
                className="bg-background rounded-lg shadow-md p-3 flex items-center"
              >
                <XCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700 font-medium">{param}</span>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
    </React.Suspense>
  );
}
