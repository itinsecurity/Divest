import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginContent from "./LoginContent";

export default async function LoginPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }
  const isDev = process.env.NODE_ENV === "development";
  return (
    <Suspense>
      <LoginContent isDev={isDev} />
    </Suspense>
  );
}
