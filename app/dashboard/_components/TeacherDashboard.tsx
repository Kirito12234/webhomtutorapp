"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  GraduationCap,
  MessageSquare,
  Share2,
  UserCheck
} from "lucide-react";
import DashboardNav from "./DashboardNav";
import { apiFetch, apiHost, getUser } from "../../lib/api";

const NAME_STORAGE_KEY = "hometutor.name";

const quickActions = [
  { id: "create", label: "Create course", icon: GraduationCap },
  { id: "schedule", label: "Schedule session", icon: ClipboardList },
  { id: "review", label: "Review requests", icon: ClipboardList },
  { id: "manage", label: "Manage students", icon: UserCheck },
  { id: "share", label: "Share invite", icon: Share2 },
  { id: "payouts", label: "Payout settings", icon: MessageSquare }
] as const;

const resolveTutorId = (course: any) =>
  String(
    course?.tutor?._id ||
      course?.tutorId?._id ||
      course?.teacher?._id ||
      course?.teacherId?._id ||
      course?.tutorId ||
      course?.teacherId ||
      course?.tutor ||
      course?.teacher ||
      ""
  );

const resolveCourseImage = (course: any) => {
  const raw = course?.thumbnailUrl || course?.imageUrl || "";
  if (!raw) return "";
  return String(raw).startsWith("http") ? raw : `${apiHost}${raw}`;
};

export default function TeacherDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [teacherName, setTeacherName] = useState("Teacher");
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [earnings, setEarnings] = useState({
    thisMonth: 0,
    lastMonth: 0,
    total: 0,
    pending: 0,
    currency: "NPR",
  });
  const [approvedPayments, setApprovedPayments] = useState<any[]>([]);
  const [lessonProgressSummary, setLessonProgressSummary] = useState({
    overallPercentage: 0,
    totalEnrolled: 0,
    completedStudents: 0,
  });

  useEffect(() => {
    const sync = async () => {
      const user = getUser<{ _id?: string }>();
      const [
        courseRes,
        requestRes,
        enrollRes,
        summaryRes,
        approvedRes,
        progressRes,
      ] = await Promise.allSettled([
        apiFetch<any>("/courses"),
        apiFetch<any>("/teacher-requests"),
        apiFetch<any>("/enrollments"),
        apiFetch<any>("/payments/summary"),
        apiFetch<any>("/payments/approved"),
        apiFetch<any>("/lessons/progress/summary"),
      ]);

      if (courseRes.status === "fulfilled") {
        const courseData = courseRes.value?.data || [];
        const filtered = user?._id
          ? courseData.filter((course: any) => {
              return resolveTutorId(course) === String(user._id);
            })
          : courseData;
        setCourses(filtered);
      }

      if (requestRes.status === "fulfilled") {
        setRequests(requestRes.value?.data || []);
      }

      if (enrollRes.status === "fulfilled") {
        setEnrollments(enrollRes.value?.data || []);
      }

      if (summaryRes.status === "fulfilled") {
        setEarnings({
          thisMonth: Number(summaryRes.value?.data?.thisMonth || 0),
          lastMonth: Number(summaryRes.value?.data?.lastMonth || 0),
          total: Number(summaryRes.value?.data?.total || 0),
          pending: Number(summaryRes.value?.data?.pending || 0),
          currency: String(summaryRes.value?.data?.currency || "NPR"),
        });
      }

      if (approvedRes.status === "fulfilled") {
        setApprovedPayments(Array.isArray(approvedRes.value?.data) ? approvedRes.value.data : []);
      }

      if (progressRes.status === "fulfilled") {
        setLessonProgressSummary({
          overallPercentage: Number(progressRes.value?.data?.overallPercentage || 0),
          totalEnrolled: Number(progressRes.value?.data?.totalEnrolled || 0),
          completedStudents: Number(progressRes.value?.data?.completedStudents || 0),
        });
      }
    };
    sync();
    const storedName = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (storedName) {
      setTeacherName(storedName.split(" ")[0]);
    }
    const interval = setInterval(sync, 4000);
    return () => clearInterval(interval);
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests]
  );

  const acceptedRequestsCount = useMemo(
    () => requests.filter((item) => item.status === "accepted").length,
    [requests]
  );

  const handleApprove = (id: string, studentName: string) => {
    apiFetch(`/teacher-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "accepted" })
    })
      .then(() => setStatusMessage("Request approved and student notified."))
      .catch(() => setStatusMessage("Unable to approve request."));
  };

  const handleDecline = (id: string) => {
    apiFetch(`/teacher-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "rejected" })
    })
      .then(() => setStatusMessage("Request declined."))
      .catch(() => setStatusMessage("Unable to decline request."));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row">
        <DashboardNav role="tutor" />

        <div className="flex flex-1 flex-col gap-6">
          <div className="rounded-3xl bg-emerald-700 p-6 text-white shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold">Welcome back, {teacherName}</h1>
                <p className="text-sm text-emerald-100">
                  You have {pendingRequests.length} new requests and {courses.length} courses.
                </p>
              </div>
              <Link
                href="/dashboard/tutor/account/reports"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
              >
                View report
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs text-slate-500">Courses</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{courses.length}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs text-slate-500">Students</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {enrollments.length || acceptedRequestsCount || 0}
              </p>
              <p className="text-xs text-slate-400">Enrolled</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs text-slate-500">Completion</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {lessonProgressSummary.overallPercentage}%
              </p>
              <p className="text-xs text-slate-400">
                {lessonProgressSummary.completedStudents}/{lessonProgressSummary.totalEnrolled} students completed
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs text-slate-500">Earnings</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Rs {Number(earnings.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">
                This month: Rs {Number(earnings.thisMonth || 0).toLocaleString()} | Last month: Rs{" "}
                {Number(earnings.lastMonth || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold text-slate-500 uppercase">Quick actions</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const linkMap: Record<string, string> = {
                  create: "/dashboard/tutor/create-course",
                  schedule: "/dashboard/tutor/schedule-session",
                  review: "/dashboard/tutor/review-requests",
                  manage: "/dashboard/tutor/manage-students",
                  share: "/dashboard/tutor/share-invite",
                  payouts: "/dashboard/tutor/account/payouts?from=dashboard"
                };
                const href = linkMap[action.id];
                return (
                  <Link
                    key={action.id}
                    href={href}
                    className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600"
                  >
                    <Icon className="h-4 w-4" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Requests</p>
              <Link href="/dashboard/tutor/message" className="text-xs font-semibold text-brand-600">
                View all
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-3">
            {pendingRequests.length === 0 && (
                <p className="text-xs text-slate-500">No pending requests yet.</p>
              )}
              {pendingRequests.map((request) => (
              <div key={request._id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                  <p className="text-sm font-semibold text-slate-900">{request.student?.name}</p>
                  <p className="text-xs text-slate-500">{request.course?.title || "Course request"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                    onClick={() => handleApprove(request._id, request.student?.name || "Student")}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                    onClick={() => handleDecline(request._id)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Courses</p>
              <Link href="/dashboard/tutor/course" className="text-xs font-semibold text-brand-600">
                View all
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {courses.slice(0, 3).map((course) => (
                <Link
                  key={course._id}
                  href={`/dashboard/tutor/course/${course._id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-emerald-700">
                    {resolveCourseImage(course) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveCourseImage(course)}
                        alt={course.title || "Course"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <GraduationCap className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                    <p className="text-xs text-slate-500">{course.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Recent earnings (database)</p>
              <span className="text-xs text-slate-500">
                Pending: Rs {Number(earnings.pending || 0).toLocaleString()}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {approvedPayments.length === 0 && (
                <p className="text-xs text-slate-500">No approved payments yet.</p>
              )}
              {approvedPayments.slice(0, 5).map((payment) => (
                (() => {
                  const amount =
                    Number(payment?.amount || 0) > 0
                      ? Number(payment.amount)
                      : Number(payment?.course?.price || 0) > 0
                        ? Number(payment.course.price)
                        : 0;
                  return (
                <div
                  key={payment._id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{payment.course?.title || "Course"}</p>
                    <p className="text-xs text-slate-500">
                      Student: {payment.student?.name || "Student"} |{" "}
                      {new Date(payment.approvedAt || payment.updatedAt || payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">
                    Rs {amount.toLocaleString()}
                  </p>
                </div>
                  );
                })()
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-emerald-700 p-6 text-white shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Connect with professionals</p>
                <p className="text-xs text-emerald-100">Find mentors, educators, and collaborators.</p>
              </div>
              <Link
                href="/dashboard/tutor/explore"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
              >
                Explore
              </Link>
            </div>
          </div>

          {statusMessage && <p className="text-xs text-emerald-600">{statusMessage}</p>}
        </div>
      </div>
    </div>
  );
}
