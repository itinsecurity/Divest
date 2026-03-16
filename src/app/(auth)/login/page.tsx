import { Suspense } from "react";
import LoginContent from "./LoginContent";

export default function LoginPage() {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <Suspense>
      <LoginContent isDev={isDev} />
    </Suspense>
  );
}
