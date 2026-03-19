import { notFound } from "next/navigation";
import { getHoldings } from "@/actions/holdings";
import { HoldingDetailClient } from "./HoldingDetailClient";

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HoldingDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getHoldings();

  if (!result.success) {
    return <div className="text-red-600">Failed to load holdings.</div>;
  }

  const holding = result.data.find((h) => h.id === id);
  if (!holding) {
    notFound();
  }

  return <HoldingDetailClient holding={holding} />;
}
