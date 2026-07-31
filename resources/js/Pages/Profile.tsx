import React from "react";
import { Link, useForm, usePage } from "@inertiajs/react";
import {
  Mail,
  Shield,
  UserCircle2,
  BadgeCheck,
  Phone,
  MapPin,
  BookOpen,
  School,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface ProfileProps {
  user: any;
}

interface SuperAdminProfileProps extends ProfileProps {
  inSuperAdminShell?: boolean;
}

function ChangePasswordCard() {
  const page = usePage<{ flash?: { success?: string; error?: string } }>();
  const { data, setData, patch, processing, errors, reset } = useForm({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch("/profile/password", {
      preserveScroll: true,
      onSuccess: () => reset("current_password", "password", "password_confirmation"),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your sign-in password for this account.</CardDescription>
      </CardHeader>
      <CardContent>
        {page.props.flash?.success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {page.props.flash.success}
          </div>
        )}

        {page.props.flash?.error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {page.props.flash.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={data.current_password}
              onChange={(e) => setData("current_password", e.target.value)}
            />
            {errors.current_password && <p className="text-sm text-red-600">{errors.current_password}</p>}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={data.password}
                onChange={(e) => setData("password", e.target.value)}
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">Confirm New Password</Label>
              <Input
                id="password_confirmation"
                type="password"
                value={data.password_confirmation}
                onChange={(e) => setData("password_confirmation", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={processing}>
              {processing ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const formatRole = (role: string) =>
  role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatStatus = (status?: string) => {
  if (!status) return "Active";
  return status
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

function StudentProfile({ user }: ProfileProps) {
  const studentDetails = [
    {
      label: "Student Name",
      value: user.name,
      icon: UserCircle2,
    },
    {
      label: "Student Email",
      value: user.email,
      icon: Mail,
    },
    {
      label: "Role",
      value: "Student",
      icon: School,
    },
    {
      label: "Account Status",
      value: formatStatus(user.status),
      icon: BadgeCheck,
    },
    {
      label: "Phone",
      value: user.phone || "Not updated yet",
      icon: Phone,
    },
    {
      label: "Address",
      value: user.address || "Not updated yet",
      icon: MapPin,
    },
  ];

  return (
    <DashboardLayout user={user} activeTab="profile">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Profile</h1>
          <p className="mt-1 text-gray-600">A student-focused overview of your account and school identity.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-blue-100">
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-100">Student Account</p>
                  <h2 className="mt-2 text-2xl font-bold">{user.name}</h2>
                  <p className="mt-1 text-sm text-blue-100">{user.email}</p>
                </div>
                <Avatar className="h-20 w-20 border-4 border-white/30">
                  <AvatarFallback className="bg-white/20 text-3xl font-semibold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                  {formatRole(user.role)}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                  {formatStatus(user.status)}
                </span>
              </div>
            </div>

            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-semibold">Student Access</span>
                </div>
                <p className="text-sm text-blue-900">
                  Use this page to view your registered account information before checking exams, attendance, fees, and messages.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">User ID</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">{user.id}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Portal</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">Student</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Your current account details available in the system</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {studentDetails.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-gray-500">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">{item.value}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="xl:col-span-2">
            <ChangePasswordCard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export function SuperAdminProfile({ user, inSuperAdminShell = false }: SuperAdminProfileProps) {
  const oversightCards = [
    {
      label: "Full Name",
      value: user.name,
      icon: UserCircle2,
    },
    {
      label: "Email Address",
      value: user.email,
      icon: Mail,
    },
    {
      label: "Role",
      value: "Super Admin",
      icon: Shield,
    },
    {
      label: "Account Status",
      value: formatStatus(user.status),
      icon: BadgeCheck,
    },
    {
      label: "Phone",
      value: user.phone || "Add your direct contact number",
      icon: Phone,
    },
    {
      label: "Address",
      value: user.address || "Add your working location or mailing address",
      icon: MapPin,
    },
  ];

  const content = (
    <div className="p-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Superadmin Profile</h1>
            <p className="mt-1 text-gray-600">Review and maintain your platform-level account details.</p>
          </div>
          <Button asChild>
            <Link href={inSuperAdminShell ? "/superadmin/profile/edit" : "/profile/edit"}>Update Profile</Link>
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-slate-200">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-100">Platform Oversight Account</p>
                  <h2 className="mt-2 text-2xl font-bold">{user.name}</h2>
                  <p className="mt-1 text-sm text-blue-100">{user.email}</p>
                </div>
                <Avatar className="h-20 w-20 border-4 border-white/20">
                  <AvatarFallback className="bg-white/10 text-3xl font-semibold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  Super Admin
                </span>
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  {formatStatus(user.status)}
                </span>
              </div>
            </div>

            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-blue-700">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-semibold">Superadmin Scope</span>
                </div>
                <p className="text-sm text-blue-900">
                  Keep this profile current so platform notifications, verification steps, and recovery flows reach the right account owner.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">User ID</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">{user.id}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Organization Scope</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">Global</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your current superadmin account information</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {oversightCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center gap-2 text-gray-500">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{item.value}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {user.pending_email && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Pending Email Verification</CardTitle>
                  <CardDescription className="text-blue-800">
                    Verify the OTP sent to {user.pending_email} to complete your email update.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="border-blue-300 bg-white text-blue-900 hover:bg-blue-100">
                    <Link href={inSuperAdminShell ? "/superadmin/profile/edit" : "/profile/edit"}>Complete Verification</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <ChangePasswordCard />
          </div>
        </div>
      </div>
  );

  if (inSuperAdminShell) {
    return content;
  }

  return (
    <DashboardLayout user={user} activeTab="profile">
      {content}
    </DashboardLayout>
  );
}

function AdminProfile({ user }: ProfileProps) {
  const detailCards = [
    {
      label: "Full Name",
      value: user.name,
      icon: UserCircle2,
    },
    {
      label: "Email Address",
      value: user.email,
      icon: Mail,
    },
    {
      label: "Role",
      value: formatRole(user.role),
      icon: Shield,
    },
  ];

  return (
    <DashboardLayout user={user} activeTab="profile">
      <div className="p-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
            <p className="mt-1 text-gray-600">View your account information and role details.</p>
          </div>
          <Button asChild>
            <Link href="/profile/edit">Edit Profile</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Profile Summary</CardTitle>
              <CardDescription>Your account at a glance</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="mb-4 h-24 w-24">
                <AvatarFallback className="bg-blue-100 text-3xl font-semibold text-blue-600">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
              <span className="mt-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {formatRole(user.role)}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Basic information available for this admin account</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {detailCards.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-gray-500">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <p className="text-base font-semibold text-gray-900">{item.value}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <ChangePasswordCard />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Profile({ user }: ProfileProps) {
  if (user.role === "student") {
    return <StudentProfile user={user} />;
  }

  if (user.role === "super_admin") {
    return <SuperAdminProfile user={user} />;
  }

  return <AdminProfile user={user} />;
}
