"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { HoldingWithProfile } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserSuppliedBadge } from "@/components/ui/UserSuppliedBadge";
import { updateHolding, deleteHolding } from "@/actions/holdings";
import { updateProfileField, refreshProfile } from "@/actions/profiles";
import { uploadDocument, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from "@/actions/upload";

type Props = {
  holding: HoldingWithProfile;
};

function formatNOK(value: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("nb-NO");
}

export function HoldingDetailClient({ holding: initialHolding }: Props) {
  const [holding, setHolding] = useState(initialHolding);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [editForm, setEditForm] = useState({
    accountName: holding.accountName,
    shares: holding.shares?.toString() ?? "",
    pricePerShare: holding.pricePerShare?.toString() ?? "",
    currentValue: holding.currentValue?.toString() ?? "",
  });

  // Profile field inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldEditValue, setFieldEditValue] = useState("");
  const [fieldEditPending, startFieldTransition] = useTransition();

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const input: Record<string, string | number> = {};
      if (editForm.accountName !== holding.accountName) {
        input.accountName = editForm.accountName;
      }
      if (holding.instrumentType === "STOCK") {
        if (editForm.shares) input.shares = Number(editForm.shares);
        if (editForm.pricePerShare)
          input.pricePerShare = Number(editForm.pricePerShare);
      } else {
        if (editForm.currentValue)
          input.currentValue = Number(editForm.currentValue);
      }

      const result = await updateHolding(holding.id, input);
      if (result.success) {
        setHolding(result.data);
        setIsEditing(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    startDeleteTransition(async () => {
      const result = await deleteHolding(holding.id);
      if (result.success) {
        router.push("/holdings");
      } else {
        setError(result.error);
      }
    });
  }

  function handleRefresh() {
    if (!holding.assetProfile) return;
    startRefreshTransition(async () => {
      const result = await refreshProfile(holding.assetProfile!.id);
      if (result.success) {
        // Update local state to show PENDING
        setHolding((prev) => ({ ...prev, enrichmentStatus: "PENDING" }));
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function startFieldEdit(fieldName: string, currentValue: string) {
    setEditingField(fieldName);
    setFieldEditValue(currentValue);
  }

  function handleFieldSave(fieldName: string) {
    if (!holding.assetProfile) return;
    startFieldTransition(async () => {
      const result = await updateProfileField(
        holding.assetProfile!.id,
        fieldName,
        fieldEditValue
      );
      if (result.success) {
        setHolding((prev) => ({
          ...prev,
          assetProfile: result.data,
        }));
        setEditingField(null);
      } else {
        setError(result.error);
      }
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !holding.assetProfile) return;

    // Client-side validation
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File exceeds 5 MB limit");
      return;
    }
    if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setUploadError(
        "Unsupported file type. Accepted: PDF, PNG, JPG, TXT, CSV, MD"
      );
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);

    startUploadTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadDocument(holding.assetProfile!.id, fd);
      if (result.success) {
        setUploadSuccess(true);
        setHolding((prev) => ({ ...prev, enrichmentStatus: "PENDING" }));
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setUploadError(result.error);
      }
    });
  }

  const profile = holding.assetProfile;
  const showUploadPrompt =
    holding.enrichmentStatus === "NOT_FOUND" ||
    holding.enrichmentStatus === "PARTIAL";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/holdings")}
            className="mb-2 text-sm text-blue-600 hover:underline"
          >
            ← Back to Holdings
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.name ?? holding.instrumentIdentifier}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {holding.instrumentType}
            </span>
            <span className="text-gray-300">·</span>
            <StatusBadge status={holding.enrichmentStatus} />
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              {profile && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Profile"}
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          className="rounded-md bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Holding Details / Edit Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Position Details
        </h2>

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Name
              </label>
              <input
                name="accountName"
                value={editForm.accountName}
                onChange={handleEditChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {holding.instrumentType === "STOCK" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Shares
                  </label>
                  <input
                    name="shares"
                    type="number"
                    step="any"
                    value={editForm.shares}
                    onChange={handleEditChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price per Share (NOK)
                  </label>
                  <input
                    name="pricePerShare"
                    type="number"
                    step="any"
                    value={editForm.pricePerShare}
                    onChange={handleEditChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Value (NOK)
                </label>
                <input
                  name="currentValue"
                  type="number"
                  step="any"
                  value={editForm.currentValue}
                  onChange={handleEditChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Account</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {holding.accountName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Current Value
              </dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900">
                {formatNOK(holding.displayValue)}
              </dd>
            </div>
            {holding.instrumentType === "STOCK" && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Shares</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {holding.shares}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Price per Share
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {holding.pricePerShare
                      ? formatNOK(holding.pricePerShare)
                      : "—"}
                  </dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last Updated
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(holding.lastUpdated)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Asset Profile */}
      {profile && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Asset Profile
          </h2>
          <dl className="grid grid-cols-2 gap-4">
            {(
              [
                ["name", "Name"],
                ["isin", "ISIN"],
                ["ticker", "Ticker"],
                ["exchange", "Exchange"],
                ["country", "Country"],
                ["sector", "Sector"],
                ["industry", "Industry"],
                ["fundManager", "Fund Manager"],
                ["fundCategory", "Fund Category"],
              ] as const
            ).map(([field, label]) => {
              const value = profile[field as keyof typeof profile] as
                | string
                | null;
              if (!value) return null;
              const isUserSupplied =
                profile.fieldSources?.[field]?.source === "user";

              return (
                <div key={field}>
                  <dt className="flex items-center gap-1 text-sm font-medium text-gray-500">
                    {label}
                    {isUserSupplied && <UserSuppliedBadge />}
                  </dt>
                  {editingField === field ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        value={fieldEditValue}
                        onChange={(e) => setFieldEditValue(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleFieldSave(field)}
                        disabled={fieldEditPending}
                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingField(null)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <dd
                      className="mt-1 cursor-pointer text-sm text-gray-900 hover:text-blue-600"
                      title="Click to edit"
                      onClick={() => startFieldEdit(field, value)}
                    >
                      {value}
                    </dd>
                  )}
                </div>
              );
            })}
            {profile.equityPct !== null && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Equity %</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {profile.equityPct}%
                </dd>
              </div>
            )}
            {profile.bondPct !== null && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bond %</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {profile.bondPct}%
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Document Upload */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Upload Document
        </h2>
        {showUploadPrompt && (
          <p className="mb-3 text-sm text-amber-700">
            {holding.enrichmentStatus === "NOT_FOUND"
              ? "No data was found automatically. Upload a PDF, image, or text document to extract profile information."
              : "Partial data found. Upload a document to fill in missing fields."}
          </p>
        )}
        <p className="mb-3 text-sm text-gray-500">
          Accepted formats: PDF, PNG, JPG, TXT, CSV, MD (max 5 MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.md"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="block text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        {isUploading && (
          <p className="mt-2 text-sm text-gray-500">Processing document...</p>
        )}
        {uploadSuccess && (
          <p className="mt-2 text-sm text-green-600">
            Document accepted. Enrichment is processing in the background.
          </p>
        )}
        {uploadError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
