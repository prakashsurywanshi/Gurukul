import React, { useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BellRing, CalendarDays, ChevronLeft, ChevronRight, Clock3, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../ui/utils';

interface TodoPageProps {
  user: any;
  todos: TodoItem[];
}

interface TodoItem {
  id: string;
  title: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  note: string;
  completed: boolean;
  completedAt?: string;
  createdAt?: string;
}

interface CalendarCell {
  key: string;
  blank: boolean;
  day?: number;
  dateKey?: string;
  isToday?: boolean;
  isSelected?: boolean;
  isWeekend?: boolean;
  todos?: TodoItem[];
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const priorityBadgeClass: Record<TodoItem['priority'], string> = {
  Low: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Medium: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  High: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const monthOffset = (month: string, offset: number) => {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, monthIndex - 1 + offset, 1);
  return toMonthKey(date);
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isSameDay = (date: Date, isoDate: string) => toDateKey(date) === isoDate;

export default function TodoPage({ user, todos }: TodoPageProps) {
  const flash = (usePage().props as any).flash ?? {};
  const initialSelectedDate = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate);
  const [visibleMonth, setVisibleMonth] = useState<string>(toMonthKey(initialSelectedDate));
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(toDateKey(initialSelectedDate));
  const [priority, setPriority] = useState<TodoItem['priority']>('Medium');
  const [note, setNote] = useState('');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);

  const selectedDateKey = toDateKey(selectedDate);

  const selectedDayTodos = useMemo(
    () => todos.filter((todo) => isSameDay(selectedDate, todo.dueDate)),
    [selectedDate, todos]
  );

  const upcomingTodos = useMemo(
    () =>
      [...todos]
        .filter((todo) => !todo.completed)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [todos]
  );

  const selectedMonthLabel = useMemo(() => {
    const [year, month] = visibleMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  }, [visibleMonth]);

  const selectedDaySummary = useMemo(
    () => ({
      total: selectedDayTodos.length,
      active: selectedDayTodos.filter((todo) => !todo.completed).length,
      completed: selectedDayTodos.filter((todo) => todo.completed).length,
    }),
    [selectedDayTodos]
  );

  const calendarWeeks = useMemo(() => {
    const [year, monthIndex] = visibleMonth.split('-').map(Number);
    const firstDay = new Date(year, monthIndex - 1, 1);
    const daysInMonth = new Date(year, monthIndex, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const totalCells = 42;
    const today = new Date();
    const currentMonthKey = toMonthKey(today);
    const todayDateKey = currentMonthKey === visibleMonth ? toDateKey(today) : null;

    const cells: CalendarCell[] = Array.from({ length: totalCells }, (_, index) => {
      const dayOffset = index - leadingBlanks + 1;

      if (dayOffset < 1 || dayOffset > daysInMonth) {
        return {
          key: `blank-${index}`,
          blank: true,
        };
      }

      const dateKey = `${visibleMonth}-${String(dayOffset).padStart(2, '0')}`;
      const dayTodos = todos.filter((todo) => todo.dueDate === dateKey);

      return {
        key: dateKey,
        blank: false,
        day: dayOffset,
        dateKey,
        isToday: todayDateKey === dateKey,
        isSelected: selectedDateKey === dateKey,
        isWeekend: index % 7 === 0 || index % 7 === 6,
        todos: dayTodos,
      };
    });

    return Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  }, [selectedDateKey, todos, visibleMonth]);

  const resetForm = () => {
    setTitle('');
    setNote('');
    setPriority('Medium');
    setDueDate(selectedDateKey);
    setEditingTodoId(null);
  };

  const handleSelectDate = (dateKey: string) => {
    const nextDate = parseDateKey(dateKey);
    setSelectedDate(nextDate);
    setVisibleMonth(toMonthKey(nextDate));
    setDueDate(dateKey);
  };

  const handleSaveTodo = () => {
    if (!title.trim() || !dueDate) {
      return;
    }

    const payload = {
      title: title.trim(),
      dueDate,
      priority,
      note: note.trim(),
    };

    const onSuccess = () => {
      const nextSelectedDate = parseDateKey(dueDate);
      setSelectedDate(nextSelectedDate);
      setVisibleMonth(toMonthKey(nextSelectedDate));
      setTitle('');
      setNote('');
      setPriority('Medium');
      setDueDate(toDateKey(nextSelectedDate));
      setEditingTodoId(null);
    };

    if (editingTodoId) {
      router.patch(`/todo/${editingTodoId}`, payload, {
        preserveScroll: true,
        onSuccess,
      });
      return;
    }

    router.post('/todo', payload, {
      preserveScroll: true,
      onSuccess,
    });
  };

  const toggleTodo = (todo: TodoItem) => {
    router.patch(
      `/todo/${todo.id}/toggle`,
      {},
      {
        preserveScroll: true,
      }
    );
  };

  const handleEditTodo = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setTitle(todo.title);
    setDueDate(todo.dueDate);
    setPriority(todo.priority);
    setNote(todo.note);
    const editDate = parseDateKey(todo.dueDate);
    setSelectedDate(editDate);
    setVisibleMonth(toMonthKey(editDate));
  };

  const handleDeleteTodo = (todoId: string) => {
    router.delete(`/todo/${todoId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (editingTodoId === todoId) {
          resetForm();
        }
      },
    });
  };

  const handleMonthChange = (offset: number) => {
    setVisibleMonth((current) => monthOffset(current, offset));
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setVisibleMonth(toMonthKey(today));
    setDueDate(toDateKey(today));
  };

  return (
    <DashboardLayout user={user} activeTab="todo">
      <div className="space-y-6 bg-slate-50/60 p-4 sm:p-6">
        {flash.success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{flash.success}</div>
        ) : null}
        {flash.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{flash.error}</div>
        ) : null}

        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-start">
          <div className="text-left xl:mr-auto">
            <h1 className="text-3xl font-bold text-gray-900">TO DO</h1>
            <p className="mt-1 max-w-2xl text-gray-600">Create reminders, track pending work, and review monthly tasks on the calendar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Selected Day</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(selectedDate)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <BellRing className="h-4 w-4" />
              {upcomingTodos.length} active reminder{upcomingTodos.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-blue-600" />
                  Upcoming Reminders
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {upcomingTodos.map((todo) => (
                  <div key={todo.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{todo.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{todo.note || 'No additional note added.'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityBadgeClass[todo.priority]}>{todo.priority}</Badge>
                      <span className="text-sm text-slate-500">{todo.dueDate}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleEditTodo(todo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteTodo(todo.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
                {upcomingTodos.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    All reminders are completed.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>{editingTodoId ? 'Edit Reminder' : 'Add Reminder'}</CardTitle>
                <p className="text-sm text-slate-500">
                  {editingTodoId ? 'Update the selected reminder details.' : 'Add a reminder for the selected calendar date.'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter reminder title" />
                </div>
                <div className="space-y-2">
                  <Label>Reminder Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setDueDate(nextDate);
                      if (nextDate) {
                        const parsedDate = parseDateKey(nextDate);
                        setSelectedDate(parsedDate);
                        setVisibleMonth(toMonthKey(parsedDate));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as TodoItem['priority'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add reminder details" rows={4} />
                </div>
                <Button className="w-full gap-2" onClick={handleSaveTodo}>
                  <Plus className="h-4 w-4" />
                  {editingTodoId ? 'Update TO DO' : 'Add TO DO'}
                </Button>
                {editingTodoId ? (
                  <Button type="button" variant="outline" className="w-full" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                    <CalendarDays className="h-4 w-4" />
                    Manual Month View
                  </div>
                  <CardTitle className="text-xl text-slate-900">Monthly Task Calendar</CardTitle>
                  <p className="text-sm text-slate-500">Select a date to see its reminders</p>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleMonthChange(-1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 transition-colors hover:bg-slate-100"
                      >
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                      </button>
                      <div className="min-w-0 text-center">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Visible Month</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{selectedMonthLabel}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMonthChange(1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 transition-colors hover:bg-slate-100"
                      >
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </button>
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={handleToday}>
                      Today
                    </Button>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Selected Date</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {formatDate(selectedDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Tasks On Day</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedDaySummary.total}</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedDaySummary.active} active reminders</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Month Status</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{upcomingTodos.length}</p>
                    <p className="mt-1 text-sm text-slate-500">Upcoming reminders</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                      {weekDays.map((day, index) => (
                        <div
                          key={day}
                          className={`flex h-9 items-center justify-center border-r border-slate-200 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:h-10 sm:text-xs ${
                            index === 6 ? 'border-r-0' : ''
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {calendarWeeks.flat().map((cell, index) => {
                        const isLastColumn = index % 7 === 6;
                        const isLastRow = index >= 35;

                        if (cell.blank) {
                          return (
                            <div
                              key={cell.key}
                              className={`min-h-[88px] border-r border-b border-slate-200 bg-slate-50/80 sm:min-h-[96px] ${
                                isLastColumn ? 'border-r-0' : ''
                              } ${isLastRow ? 'border-b-0' : ''}`}
                            />
                          );
                        }

                        const activeCount = cell.todos ? cell.todos.filter((todo) => !todo.completed).length : 0;

                        return (
                          <button
                            key={cell.key}
                            type="button"
                            onClick={() => handleSelectDate(cell.dateKey!)}
                            className={`min-h-[88px] border-r border-b border-slate-200 p-1.5 text-left align-top transition-colors sm:min-h-[96px] sm:p-2 ${
                              cell.isSelected
                                ? 'bg-blue-50 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.15)]'
                                : cell.todos && cell.todos.length > 0
                                  ? 'bg-cyan-50/70 hover:bg-cyan-50'
                                  : cell.isWeekend
                                    ? 'bg-slate-50 hover:bg-slate-100'
                                    : 'bg-white hover:bg-slate-50'
                            } ${isLastColumn ? 'border-r-0' : ''} ${isLastRow ? 'border-b-0' : ''}`}
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-start justify-between gap-1">
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs ${
                                    cell.isSelected
                                      ? 'bg-blue-600 text-white'
                                      : cell.isToday
                                        ? 'border border-blue-200 bg-blue-100 text-blue-700'
                                        : 'bg-transparent text-slate-900'
                                  }`}
                                >
                                  {cell.day}
                                </span>
                                {cell.todos && cell.todos.length > 0 ? (
                                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 sm:text-[10px]">
                                    {cell.todos.length}
                                  </span>
                                ) : null}
                              </div>

                              {cell.todos && cell.todos.length > 0 ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-medium leading-3.5 text-slate-700 sm:text-[11px]">
                                    {activeCount} active
                                  </p>
                                  <p className="line-clamp-1 break-words text-[10px] leading-3.5 text-slate-500 sm:text-[11px]">
                                    {cell.todos[0].title}
                                  </p>
                                </div>
                              ) : (
                                <p className="pt-1 text-[10px] leading-3.5 text-slate-400 sm:text-[11px]">
                                  No reminders
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm xl:sticky xl:top-24">
              <CardHeader>
                <CardTitle>Selected Day Tasks</CardTitle>
                <p className="text-sm text-slate-500">
                  {formatDate(selectedDate)}
                </p>
              </CardHeader>
              <CardContent>
                {selectedDayTodos.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`rounded-2xl border p-4 transition ${
                          todo.completed ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={todo.completed}
                              onCheckedChange={() => toggleTodo(todo)}
                              className="mt-1"
                            />
                            <div>
                              <p className={`font-semibold ${todo.completed ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                                {todo.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">{todo.note || 'No additional note added.'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Badge className={priorityBadgeClass[todo.priority]}>{todo.priority}</Badge>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleEditTodo(todo)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteTodo(todo.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
                    <ListTodo className="h-10 w-10 text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-slate-700">No reminders for this day</p>
                    <p className="mt-1 text-sm text-slate-500">Pick another date or add a new TO DO reminder.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
