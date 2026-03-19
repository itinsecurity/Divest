import { getHoldings } from "@/actions/holdings";
import { computeStockInterestBalance, computeSectorSpread, computeGeographicSpread } from "@/lib/spread";
import { DonutChart } from "@/components/charts/DonutChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { AccountFilter } from "@/components/ui/AccountFilter";

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ account?: string }>;
};

export default async function PortfolioPage({ searchParams }: Props) {
  const { account } = await searchParams;

  const result = await getHoldings(account ? { accountName: account } : undefined);
  const holdings = result.success ? result.data : [];

  // Get unique account names for filter
  const allResult = await getHoldings();
  const allHoldings = allResult.success ? allResult.data : [];
  const accountNames = Array.from(new Set(allHoldings.map((h) => h.accountName))).sort();

  const balance = computeStockInterestBalance(holdings);
  const sectorSpread = computeSectorSpread(holdings);
  const geographicSpread = computeGeographicSpread(holdings);

  const hasAnyHoldings = holdings.length > 0;
  const allNotFound = hasAnyHoldings && holdings.every((h) => h.enrichmentStatus === "NOT_FOUND");
  const incompleteCount = Math.max(
    sectorSpread.incompleteHoldings,
    geographicSpread.incompleteHoldings
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        <AccountFilter accounts={accountNames} selected={account} />
      </div>

      {!hasAnyHoldings && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            No holdings found. Add holdings to see your portfolio spread analysis.
          </p>
        </div>
      )}

      {allNotFound && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-700" role="alert">
          None of your holdings have been enriched with profile data yet. Spread analysis may be
          inaccurate until enrichment completes.
        </div>
      )}

      {incompleteCount > 0 && !allNotFound && (
        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-700" role="alert">
          {incompleteCount} holding{incompleteCount === 1 ? "" : "s"} without complete profile data.
          Spread analysis may be incomplete.
        </div>
      )}

      {hasAnyHoldings && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stock/Interest Balance */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Stock / Interest Balance
            </h2>
            <StackedBarChart balance={balance} title="Equity vs Interest" />
          </div>

          {/* Sector Spread */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Sector Spread</h2>
            {sectorSpread.buckets.length === 0 ? (
              <p className="text-sm text-gray-500">
                No sector data available. Enrich holdings to see sector distribution.
              </p>
            ) : (
              <DonutChart buckets={sectorSpread.buckets} title="By Sector" />
            )}
          </div>

          {/* Geographic Spread */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Geographic Spread</h2>
            {geographicSpread.buckets.length === 0 ? (
              <p className="text-sm text-gray-500">
                No geographic data available. Enrich holdings to see geographic distribution.
              </p>
            ) : (
              <DonutChart buckets={geographicSpread.buckets} title="By Geography" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
