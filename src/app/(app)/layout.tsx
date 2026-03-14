import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold text-gray-900">
                Divest
              </span>
              <div className="flex gap-4">
                <Link
                  href="/holdings"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Holdings
                </Link>
                <Link
                  href="/portfolio"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Portfolio
                </Link>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {session.user?.name ?? "User"}
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
