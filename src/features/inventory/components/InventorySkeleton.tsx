export function InventoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse mx-auto" />
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse mx-auto" />
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" />
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="h-4 w-14 bg-muted rounded animate-pulse mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="bg-background">
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-4 w-8 bg-muted rounded animate-pulse mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-8 w-24 bg-muted rounded animate-pulse mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="h-4 w-4 bg-muted rounded animate-pulse mx-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InventoryStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="mt-1 h-6 w-8 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
