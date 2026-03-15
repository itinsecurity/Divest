"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HoldingWithProfile } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createHolding } from "@/actions/holdings";

type Props = {
  initialHoldings: HoldingWithProfile[];
};

function formatNOK(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO");
}

type NewHoldingForm = {
  instrumentIdentifier: string;
  instrumentType: "STOCK" | "FUND";
  accountName: string;
  shares: string;
  pricePerShare: string;
  currentValue: string;
};

const emptyForm: NewHoldingForm = {
  instrumentIdentifier: "",
  instrumentType: "STOCK",
  accountName: "",
  shares: "",
  pricePerShare: "",
  currentValue: "",
};

export function HoldingsClient({ initialHoldings }: Props) {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [accountFilter, setAccountFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewHoldingForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const accounts = ["All", ...Array.from(new Set(holdings.map((h) => h.accountName)))];
  const filtered =
    accountFilter === "All"
      ? holdings
      : holdings.filter((h) => h.accountName === accountFilter);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const input =
        form.instrumentType === "STOCK"
          ? {
              instrumentIdentifier: form.instrumentIdentifier,
              instrumentType: "STOCK" as const,
              accountName: form.accountName,
              shares: form.shares ? Number(form.shares) : undefined,
              pricePerShare: form.pricePerShare
                ? Number(form.pricePerShare)
                : undefined,
            }
          : {
              instrumentIdentifier: form.instrumentIdentifier,
              instrumentType: "FUND" as const,
              accountName: form.accountName,
              currentValue: form.currentValue
                ? Number(form.currentValue)
                : undefined,
            };

      const result = await createHolding(input);
      if (result.success) {
        setHoldings((prev) => [result.data, ...prev]);
        setForm(emptyForm);
        setShowAddForm(false);
        router.refresh();
      } else {
        setFormError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      }
    });
  }

  return (
    <div>
      {/* Account filter + Add button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label
            htmlFor="account-filter"
            className="text-sm font-medium text-gray-700"
          >
            Account:
          </label>
          <select
            id="account-filter"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm((prev) => !prev)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showAddForm ? "Cancel" : "Add Holding"}
        </button>
      </div>

      {/* Add Holding Form */}
      {showAddForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Add New Holding
          </h2>
          <form onSubmit={handleAddSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Instrument (ticker/ISIN/name)
                </label>
                <input
                  name="instrumentIdentifier"
                  value={form.instrumentIdentifier}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.instrumentIdentifier && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.instrumentIdentifier[0]}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  name="instrumentType"
                  value={form.instrumentType}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="STOCK">Stock</option>
                  <option value="FUND">Fund</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Name
                </label>
                <input
                  name="accountName"
                  value={form.accountName}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.accountName && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.accountName[0]}
                  </p>
                )}
              </div>
            </div>

            {form.instrumentType === "STOCK" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Shares
                  </label>
                  <input
                    name="shares"
                    type="number"
                    step="any"
                    value={form.shares}
                    onChange={handleFormChange}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  {fieldErrors.shares && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.shares[0]}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price per Share (NOK)
                  </label>
                  <input
                    name="pricePerShare"
                    type="number"
                    step="any"
                    value={form.pricePerShare}
                    onChange={handleFormChange}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  {fieldErrors.pricePerShare && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.pricePerShare[0]}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Value (NOK)
                </label>
                <input
                  name="currentValue"
                  type="number"
                  step="any"
                  value={form.currentValue}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                {fieldErrors.currentValue && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.currentValue[0]}
                  </p>
                )}
              </div>
            )}

            {formError && (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setForm(emptyForm);
                  setFormError(null);
                  setFieldErrors({});
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add Holding"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holdings Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Instrument
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Value (NOK)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No holdings found.{" "}
                  {accountFilter !== "All" &&
                    "Try selecting a different account or "}
                  Add a holding to get started.
                </td>
              </tr>
            ) : (
              filtered.map((h) => (
                <tr
                  key={h.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/holdings/${h.id}`)}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {h.assetProfile?.name ?? h.instrumentIdentifier}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {h.instrumentType}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {h.accountName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                    {formatNOK(h.displayValue)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={h.enrichmentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(h.lastUpdated)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
