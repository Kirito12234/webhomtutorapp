"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OnboardingCard from "./OnboardingCard";

export default function PublicHomeFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboardingOpen = searchParams.get("flow") === "onboarding";

  const openOnboarding = useCallback(() => {
    router.push("/?flow=onboarding", { scroll: false });
  }, [router]);

  const closeOnboarding = useCallback(() => {
    router.push("/", { scroll: false });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="h-8 w-full bg-blue-100">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-end gap-6 px-6 text-sm text-slate-700">
          <button type="button" onClick={openOnboarding} className="underline">
            Donate
          </button>
          <button type="button" onClick={openOnboarding} className="underline">
            Partner With Us
          </button>
        </div>
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
          <p className="text-4xl font-semibold tracking-tight text-slate-900">learn to be</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openOnboarding}
              className="rounded-xl border border-brand-600 px-6 py-2 text-sm font-semibold text-brand-600"
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={openOnboarding}
              className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-semibold text-white"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-6 py-20 lg:grid-cols-2">
        <div>
          <h1 className="text-6xl font-semibold leading-tight text-slate-900">
            Free online tutoring to help kids learn to{" "}
            <span className="text-brand-600">be amazing</span>
          </h1>
          <p className="mt-6 max-w-2xl text-3xl text-slate-700">
            Students get 1-on-1 tutoring for math and reading completely free.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              onClick={openOnboarding}
              className="rounded-2xl bg-brand-600 px-8 py-4 text-xl font-semibold text-white"
            >
              Get Free Tutoring
            </button>
            <button
              type="button"
              onClick={openOnboarding}
              className="rounded-2xl px-8 py-4 text-xl font-semibold text-slate-900"
            >
              Become A Tutor
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="h-[420px] w-full max-w-[520px] rounded-2xl bg-white p-4 shadow-soft">
            <img
              src="/home-tutor-hero.svg"
              alt="Home tutor learning illustration"
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
        </div>
      </main>

      {isOnboardingOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 p-4 sm:p-8">
          <div className="mx-auto h-full w-full max-w-6xl overflow-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={closeOnboarding}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={closeOnboarding}
                className="text-sm font-semibold text-slate-500"
              >
                Close
              </button>
            </div>
            <div className="mx-auto w-full max-w-3xl">
              <OnboardingCard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
