import { FormEvent, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { CalendarCheck, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface SessionsProps {
  user: any;
  sessionRecords: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    status: 'active' | 'inactive' | 'completed';
  }[];
}

export default function Sessions({ user, sessionRecords }: SessionsProps) {
  const flash = (usePage().props as any).flash ?? {};
  const sessions = useMemo(() => sessionRecords, [sessionRecords]);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.is_current)?.name || sessions[0]?.name || 'Not Set',
    [sessions]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [newSession, setNewSession] = useState('');
  const [editingSession, setEditingSession] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const normalizeSession = (value: string) => value.trim();

  const handleAddSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSession = normalizeSession(newSession);
    if (!normalizedSession) {
      return;
    }

    router.post('/sessions', { name: normalizedSession }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsEditing(false);
        setNewSession('');
      },
    });
  };

  const handleUpdateSession = () => {
    if (!editingSession) {
      return;
    }

    const normalizedSession = normalizeSession(editingValue);
    if (!normalizedSession) {
      return;
    }

    router.patch(`/sessions/${editingSession}`, { name: normalizedSession }, {
      preserveScroll: true,
      onSuccess: () => {
        setIsEditing(false);
        setEditingSession(null);
        setEditingValue('');
      },
    });
  };

  const handleDeleteSession = (sessionId: number) => {
    if (sessions.length === 1) {
      return;
    }

    router.delete(`/sessions/${sessionId}`, {
      preserveScroll: true,
    });
  };

  const handleSetActiveSession = (sessionId: number) => {
    if (!isEditing) {
      return;
    }

    router.patch(`/sessions/${sessionId}/activate`, {}, {
      preserveScroll: true,
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  return (
    <DashboardLayout user={user} activeTab="sessions">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Sessions</h1>
              <p className="mt-1 text-sm text-slate-600">
                Create, edit, delete, and highlight the active academic session for your school.
              </p>
            </div>
            <Button
              type="button"
              variant={isEditing ? 'outline' : 'default'}
              onClick={() => {
                setIsEditing((current) => !current);
              }}
            >
              <Pencil className="h-4 w-4" />
              {isEditing ? 'Cancel Edit' : 'Edit Session'}
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-blue-600" />
                Academic Sessions
              </CardTitle>
              <CardDescription>Keep your session list updated and clearly mark the active one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {flash.success && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  {flash.success}
                </div>
              )}

              {flash.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {flash.error}
                </div>
              )}

              {user.organization_id == null && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  No organization is linked to this admin account yet.
                </div>
              )}

              {user.organization_id != null && sessions.length === 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  No academic sessions were found in the database yet. Add your first session to get started.
                </div>
              )}

              <form onSubmit={handleAddSession} className="space-y-2">
                <Label htmlFor="new-session">Add New Session</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    id="new-session"
                    value={newSession}
                    onChange={(event) => setNewSession(event.target.value)}
                    placeholder="e.g. 2027-2028"
                    disabled={!isEditing}
                  />
                  <Button type="submit" disabled={!isEditing} className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Add Session
                  </Button>
                </div>
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Available Sessions</Label>
                  <span className="text-sm text-slate-500">Active: {selectedSession}</span>
                </div>

                <div className="space-y-3">
                  {sessions.map((session) => {
                    const isActive = session.name === selectedSession;
                    const isCurrentEditing = editingSession === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`rounded-xl border p-4 transition ${
                          isActive
                            ? 'border-blue-300 bg-blue-50 shadow-sm'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-2">
                            {isCurrentEditing ? (
                              <Input
                                value={editingValue}
                                onChange={(event) => setEditingValue(event.target.value)}
                                disabled={!isEditing}
                              />
                            ) : (
                              <div className="flex items-center gap-3">
                                <p className={`text-base font-semibold ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
                                  {session.name}
                                </p>
                                {isActive && (
                                  <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white">
                                    Active
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-sm text-slate-500">
                              {isActive ? 'This session is currently active in the system.' : 'Set this as active or edit its label.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {isCurrentEditing ? (
                              <>
                                <Button type="button" onClick={handleUpdateSession} disabled={!isEditing} className="bg-blue-600 text-white hover:bg-blue-700">
                                  <Save className="h-4 w-4" />
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingSession(null);
                                    setEditingValue('');
                                  }}
                                  disabled={!isEditing}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                {!isActive && (
                                  <Button type="button" variant="outline" onClick={() => handleSetActiveSession(session.id)} disabled={!isEditing}>
                                    <CalendarCheck className="h-4 w-4" />
                                    Make Active
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingSession(session.id);
                                    setEditingValue(session.name);
                                  }}
                                  disabled={!isEditing}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDeleteSession(session.id)}
                                  disabled={!isEditing}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <p className="text-sm text-slate-500">Session actions are enabled while edit mode is active.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
