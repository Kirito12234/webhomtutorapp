import { Suspense } from "react";
import PublicHomeFlow from "./_components/PublicHomeFlow";

export default function PublicHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
      <PublicHomeFlow />
    </Suspense>
  );
}
