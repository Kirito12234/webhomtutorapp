import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome Back
        </h1>
        <p className="text-lg text-gray-600 mb-12">
          Access your account to continue your journey with us
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button variant="primary" size="lg">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
