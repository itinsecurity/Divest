"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginContent({ isDev }: { isDev: boolean }) {
  const searchParams = useSearchParams();
  const accessDenied = searchParams.get("error") === "AccessDenied";
  const credError = searchParams.get("error") === "CredentialsSignin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    await signIn("credentials", { username, password, callbackUrl: "/" });
  }

  return (
    <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Sign In</h1>
      {accessDenied && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          Access denied. Your GitHub account is not authorized to use this
          application.
        </p>
      )}
      {credError && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          Invalid username or password.
        </p>
      )}
      {isDev && (
        <form onSubmit={handleCredentials} className="mb-4 space-y-3">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign in
          </button>
        </form>
      )}
      <button
        onClick={() => signIn("github", { callbackUrl: "/" })}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
