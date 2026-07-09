import React, { useEffect, useState } from "react";
import { User, LogOut, Menu, X, ChevronDown, Pencil, ListTodo, CalendarCheck } from "lucide-react";
import { router, usePage } from "@inertiajs/react";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function DashboardLayout({ user, activeTab, onLogout, children }: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeSession, subscriptionNotice, impersonation, staffPermissions } = usePage<{
    activeSession?: string | null;
    staffPermissions?: Record<string, Record<string, boolean>>;
    subscriptionNotice?: {
      message: string;
      daysUntilExpiry: number;
      expiryDate: string;
    } | null;
    impersonation?: {
      isImpersonating: boolean;
      impersonator: {
        id: number;
        name: string;
        email: string;
        role: string;
      };
    } | null;
  }>().props;
  const isManagedStaffRole = ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user?.role);
  const canViewTodo = user?.role === 'super_admin'
    || (isManagedStaffRole && Boolean(staffPermissions?.Todo?.view));

  const formatRole = (role: string) =>
    role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      router.post("/logout");
    }
  };

  const handleLeaveImpersonation = () => {
    router.post("/superadmin/impersonation/leave");
  };

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  return (
    <div className="dashboard-theme flex h-screen bg-transparent">
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="border-[rgba(196,155,87,0.3)] bg-[rgba(255,248,235,0.92)] text-[var(--foreground)] shadow-[0_14px_35px_rgba(8,19,31,0.18)] hover:bg-[rgba(255,252,246,1)]"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 transition-transform`}
      >
        <Sidebar
          user={user}
          activeTab={activeTab}
          onLogout={onLogout}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-[rgba(6,15,24,0.7)] backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="z-20 flex items-center justify-between border-b border-[rgba(118,86,45,0.18)] bg-[linear-gradient(180deg,rgba(11,22,35,0.96),rgba(16,31,46,0.9))] px-6 py-4 text-[var(--sidebar-foreground)] shadow-[0_18px_45px_rgba(8,19,31,0.18)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-[rgba(209,173,106,0.28)] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <CalendarCheck className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-[rgba(246,239,223,0.72)]">Session:</span>
              <span className="font-semibold text-[var(--sidebar-foreground)]">{activeSession || 'Not Set'}</span>
            </div>

            {canViewTodo && (
              <Button
                variant={activeTab === "todo" ? "default" : "outline"}
                className={`gap-2 border-[rgba(209,173,106,0.24)] ${
                  activeTab === "todo"
                    ? "bg-[linear-gradient(180deg,rgba(11,22,35,0.96),rgba(16,31,46,0.9))] !text-[var(--sidebar-foreground)] shadow-[0_18px_35px_rgba(8,19,31,0.28)] hover:bg-[linear-gradient(180deg,rgba(16,31,46,0.98),rgba(23,41,59,0.94))]"
                    : "bg-[linear-gradient(180deg,rgba(11,22,35,0.96),rgba(16,31,46,0.9))] !text-[var(--sidebar-foreground)] shadow-[0_18px_35px_rgba(8,19,31,0.2)] hover:bg-[linear-gradient(180deg,rgba(16,31,46,0.98),rgba(23,41,59,0.94))]"
                }`}
                onClick={() => router.visit("/todo")}
              >
                <ListTodo className="h-4 w-4" />
                TO DO
              </Button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-xl border border-[rgba(209,173,106,0.22)] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-left shadow-[0_12px_32px_rgba(8,19,31,0.16)] transition hover:bg-[rgba(255,255,255,0.1)]">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-[linear-gradient(135deg,#efd39d,#c49b57)] font-semibold text-[#08131f]">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-[var(--sidebar-foreground)]">{user.name}</p>
                  <p className="text-xs text-[rgba(246,239,223,0.7)]">{formatRole(user.role)}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-[rgba(246,239,223,0.7)]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">{user.name}</p>
                  <p className="text-xs font-normal text-[var(--muted-foreground)]">{user.email}</p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => router.visit("/profile")}>
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => router.visit("/profile/edit")}>
                <Pencil className="h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {impersonation?.isImpersonating && (
            <div className="border-b border-[rgba(209,173,106,0.22)] bg-[rgba(209,173,106,0.12)] px-6 py-3 text-sm text-[var(--foreground)]">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                <p>
                  You are viewing this school as {user.name}. Return to {impersonation.impersonator.name}'s superadmin account when you're done.
                </p>
                <Button variant="outline" size="sm" className="border-[rgba(196,155,87,0.28)] bg-[rgba(255,248,235,0.7)] hover:bg-[rgba(255,252,246,1)]" onClick={handleLeaveImpersonation}>
                  Stop Impersonating
                </Button>
              </div>
            </div>
          )}

          {subscriptionNotice && (
            <div className="border-b border-[rgba(196,155,87,0.24)] bg-[linear-gradient(90deg,rgba(196,155,87,0.16),rgba(196,155,87,0.08))] px-6 py-3 text-sm text-[var(--foreground)]">
              <div className="mx-auto max-w-7xl">
                <p>{subscriptionNotice.message}</p>
              </div>
            </div>
          )}

          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
