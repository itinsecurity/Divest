"use client";

import { useRouter, usePathname } from "next/navigation";

type Props = {
  accounts: string[];
  selected?: string;
};

export function AccountFilter({ accounts, selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  if (accounts.length === 0) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value) {
      router.push(`${pathname}?account=${encodeURIComponent(value)}`);
    } else {
      router.push(pathname);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="account-filter" className="text-sm text-gray-600">
        Account:
      </label>
      <select
        id="account-filter"
        value={selected ?? ""}
        onChange={handleChange}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
      >
        <option value="">All accounts</option>
        {accounts.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
