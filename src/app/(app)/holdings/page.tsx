import { getHoldings } from "@/actions/holdings";
import { HoldingsClient } from "./HoldingsClient";

export const dynamic = 'force-dynamic';

export default async function HoldingsPage() {
  const result = await getHoldings();
  const holdings = result.success ? result.data : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Holdings</h1>
      <HoldingsClient initialHoldings={holdings} />
    </div>
  );
}
