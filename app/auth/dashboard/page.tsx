"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back! Here's what's happening with your account today.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="outline" size="md">
                Home
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="md">
                Sign Out
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold">1,234</p>
              </div>
              <div className="text-4xl opacity-80">👥</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">
                  Active Sessions
                </p>
                <p className="text-3xl font-bold">567</p>
              </div>
              <div className="text-4xl opacity-80">📊</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold">$12K</p>
              </div>
              <div className="text-4xl opacity-80">💰</div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">
                  Pending Tasks
                </p>
                <p className="text-3xl font-bold">89</p>
              </div>
              <div className="text-4xl opacity-80">📋</div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-lg">✓</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Account Created</p>
                  <p className="text-sm text-gray-500">Your account was successfully created</p>
                  <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-lg">🔐</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Login Successful</p>
                  <p className="text-sm text-gray-500">You successfully logged into your account</p>
                  <p className="text-xs text-gray-400 mt-1">Just now</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-lg">⚙️</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Profile Updated</p>
                  <p className="text-sm text-gray-500">Your profile information has been updated</p>
                  <p className="text-xs text-gray-400 mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <Button variant="primary" size="md" className="w-full">
                View Profile
              </Button>
              <Button variant="outline" size="md" className="w-full">
                Edit Settings
              </Button>
              <Button variant="outline" size="md" className="w-full">
                View Reports
              </Button>
              <Button variant="outline" size="md" className="w-full">
                Manage Users
              </Button>
            </div>
          </Card>
        </div>

        {/* Additional Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Account Status
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-700 font-medium">Active</span>
            </div>
            <p className="text-sm text-gray-600">
              Your account is active and in good standing.
            </p>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Profile Completion
            </h3>
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              75% complete
            </p>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Last Login
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">Today</p>
            <p className="text-sm text-gray-600">
              You last logged in just now
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
