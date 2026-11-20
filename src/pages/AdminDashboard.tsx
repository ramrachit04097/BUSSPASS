import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Bus,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { cgiApi } from '../api/cgiClient';
import type {
  AdminReportData,
  AdminUser,
  BusPassRecord,
  BusRouteRecord,
  StudentUser,
} from '../types';
import { StatusLabel } from '../components/StatusLabel';

type AdminSection = 'dashboard' | 'applications' | 'routes' | 'users' | 'reports';

interface AdminDashboardProps {
  admin: AdminUser;
  onLogout: () => void;
}

function computeValidityDate(passType: string): string {
  const d = new Date();
  if (passType === 'Semester') {
    d.setMonth(d.getMonth() + 4);
  } else {
    d.setMonth(d.getMonth() + 8);
  }
  return d.toISOString().slice(0, 10);
}

export function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [applications, setApplications] = useState<BusPassRecord[]>([]);
  const [routes, setRoutes] = useState<BusRouteRecord[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [report, setReport] = useState<AdminReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Application filtering & search
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [appSearchQuery, setAppSearchQuery] = useState('');

  // View / Edit Application modal
  const [selectedApp, setSelectedApp] = useState<BusPassRecord | null>(null);
  const [editRoute, setEditRoute] = useState('');
  const [editBoarding, setEditBoarding] = useState('');
  const [editPassType, setEditPassType] = useState('Semester');
  const [editValidity, setEditValidity] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Route management state
  const [newRouteNumber, setNewRouteNumber] = useState('');
  const [newStartLocation, setNewStartLocation] = useState('');
  const [newEndLocation, setNewEndLocation] = useState('');
  const [newBoardingPoints, setNewBoardingPoints] = useState('');
  const [newRouteStatus, setNewRouteStatus] = useState<'Available' | 'Limited' | 'Full'>('Available');
  const [editingRoute, setEditingRoute] = useState<BusRouteRecord | null>(null);

  // Student search & detail modal
  const [studentSearchId, setStudentSearchId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);

  const loadAllAdminData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [appsData, routesData, studentsData, reportData] = await Promise.all([
        cgiApi.getApplications(),
        cgiApi.getRoutes(),
        cgiApi.listStudents(),
        cgiApi.getAdminReport(),
      ]);
      setApplications(appsData);
      setRoutes(routesData);
      setStudents(studentsData);
      setReport(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === 'Pending'),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'All') return applications;
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const routeEnrollmentMap = useMemo(() => {
    const map: Record<string, { applied: number; approved: number }> = {};
    routes.forEach((r) => {
      const key = r.routeNumber.toUpperCase();
      const routeApps = applications.filter(
        (a) => a.route.toUpperCase() === key
      );
      const applied = routeApps.length;
      const approved = routeApps.filter((a) => a.status === 'Approved').length;
      map[key] = { applied, approved };
    });
    return map;
  }, [routes, applications]);

  const handleSearchApplications = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!appSearchQuery.trim()) {
        const all = await cgiApi.getApplications();
        setApplications(all);
      } else {
        const matched = await cgiApi.searchApplications(appSearchQuery.trim());
        setApplications(matched);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    }
  };

  const handleApprove = async (applicationID: number) => {
    setError('');
    setFeedback('');
    try {
      const msg = await cgiApi.approveApplication(applicationID);
      setFeedback(msg);
      if (selectedApp?.applicationID === applicationID) {
        setSelectedApp(null);
      }
      await loadAllAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.');
    }
  };

  const handleReject = async (applicationID: number) => {
    setError('');
    setFeedback('');
    try {
      const msg = await cgiApi.rejectApplication(applicationID);
      setFeedback(msg);
      if (selectedApp?.applicationID === applicationID) {
        setSelectedApp(null);
      }
      await loadAllAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed.');
    }
  };

  const openAppDetails = (app: BusPassRecord) => {
    const resolvedRoute = app.route?.trim() || routes[0]?.routeNumber || '';
    const matchedRoute = routes.find(
      (r) => r.routeNumber.toUpperCase() === resolvedRoute.toUpperCase()
    );
    const defaultStop = matchedRoute?.boardingPoints.split(',')[0]?.trim() || '';
    const fallbackPassType = app.passType?.trim() || 'Semester';
    const fallbackValidity = app.validity?.trim() || computeValidityDate(fallbackPassType);
    setSelectedApp(app);
    setEditRoute(resolvedRoute);
    setEditBoarding(app.boardingPoint?.trim() || defaultStop);
    setEditPassType(fallbackPassType);
    setEditValidity(fallbackValidity);
    setEditStatus(app.status || 'Pending');
  };

  const handleUpdatePass = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setError('');
    setFeedback('');
    try {
      const msg = await cgiApi.updateApplication({
        applicationID: selectedApp.applicationID,
        route: editRoute,
        boardingPoint: editBoarding,
        passType: editPassType,
        validity: editValidity,
        status: editStatus,
      });
      setFeedback(msg);
      setSelectedApp(null);
      await loadAllAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleAddRoute = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    try {
      const msg = await cgiApi.addRoute({
        routeNumber: newRouteNumber.trim(),
        startLocation: newStartLocation.trim(),
        endLocation: newEndLocation.trim(),
        boardingPoints: newBoardingPoints.trim(),
        status: newRouteStatus,
      });
      setFeedback(msg);
      setNewRouteNumber('');
      setNewStartLocation('');
      setNewEndLocation('');
      setNewBoardingPoints('');
      setNewRouteStatus('Available');
      await loadAllAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add route.');
    }
  };

  const handleSaveRouteUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRoute) return;
    setError('');
    setFeedback('');
    try {
      const msg = await cgiApi.updateRoute(editingRoute);
      setFeedback(msg);
      setEditingRoute(null);
      await loadAllAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update route.');
    }
  };

  const handleDeleteRoute = async (routeNumber: string) => {
    setError('');
    setFeedback('');
    try {
      const msg = await cgiApi.deleteRoute(routeNumber);
      setFeedback(msg);
      await loadAllAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove route.');
    }
  };

  const handleSearchStudents = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await cgiApi.listStudents(studentSearchId.trim() || undefined);
      setStudents(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search students.');
    }
  };

  const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: ClipboardList },
    { id: 'routes', label: 'Routes', icon: MapPin },
    { id: 'users', label: 'Students', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const sectionTitles: Record<AdminSection, string> = {
    dashboard: 'Admin Dashboard',
    applications: 'Manage Applications',
    routes: 'Manage Routes (Max 20 Slots)',
    users: 'Registered Students',
    reports: 'Transport Reports',
  };

  const maxRouteCount = useMemo(() => {
    if (!report || report.routeCounts.length === 0) return 1;
    return Math.max(1, ...report.routeCounts.map((r) => r.count));
  }, [report]);

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111C35] text-white flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EB6B2C] text-white">
              <Bus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold tracking-tight leading-none">
                BUSPASS
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                SRM UNIVERSITY AP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded p-1 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                  setError('');
                  setFeedback('');
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#2563EB] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-[#EB6B2C] uppercase">
                  SRM UNIVERSITY AP
                </p>
                <h1 className="font-display text-lg font-bold text-[#111C35] leading-tight">
                  {sectionTitles[activeSection]}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-[#F8FAFC] px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              <div className="text-left">
                <p className="text-xs font-semibold text-[#111C35] whitespace-nowrap">
                  {admin.fullName}
                </p>
                <p className="text-[11px] font-mono text-slate-500">@{admin.username}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
          {feedback && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {feedback}
            </div>
          )}

          {/* Top KPI Strip */}
          {(activeSection === 'dashboard' || activeSection === 'applications') && report && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3.5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Applications</p>
                  <p className="font-mono text-xl font-bold text-[#111C35] tabular-nums">
                    {report.totalApplications}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3.5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500">Pending</p>
                  <p className="font-mono text-xl font-bold text-amber-700 tabular-nums">
                    {report.pendingApplications}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3.5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500">Approved</p>
                  <p className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
                    {report.approvedApplications}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3.5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <XCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500">Rejected</p>
                  <p className="font-mono text-xl font-bold text-rose-700 tabular-nums">
                    {report.rejectedApplications}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ) : (
            <>
              {/* 1. DASHBOARD OVERVIEW */}
              {activeSection === 'dashboard' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
                      <div>
                        <h2 className="font-display text-base font-bold text-[#111C35]">
                          Pending Applications Queue
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Approve or reject student bus pass requests (Max 20 slots per route).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('applications')}
                        className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        View all applications →
                      </button>
                    </div>

                    {pendingApplications.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-600">
                        No pending bus pass applications awaiting review.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                              <th className="py-3 px-4">App ID</th>
                              <th className="py-3 px-4">Student ID</th>
                              <th className="py-3 px-4">Student Name</th>
                              <th className="py-3 px-4">Route</th>
                              <th className="py-3 px-4">Pass Type</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pendingApplications.map((app) => {
                              const rStats = routeEnrollmentMap[app.route.toUpperCase()] || {
                                applied: 0,
                                approved: 0,
                              };
                              const isRouteFull = rStats.approved >= 20;
                              return (
                                <tr key={app.applicationID} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-mono font-semibold text-[#111C35] tabular-nums">
                                    #{app.applicationID}
                                  </td>
                                  <td className="py-3 px-4 font-mono">{app.studentID}</td>
                                  <td className="py-3 px-4 font-medium text-[#111C35]">{app.name}</td>
                                  <td className="py-3 px-4 font-mono">
                                    {app.route?.trim() || 'Not Assigned'}{' '}
                                    <span className="text-[10px] text-slate-500">
                                      ({rStats.approved}/20)
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-700">
                                    {app.passType?.trim() || 'Not Assigned'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <StatusLabel status={app.status} />
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openAppDetails(app)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>View</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApprove(app.applicationID)}
                                        disabled={isRouteFull}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                        title={
                                          isRouteFull
                                            ? 'Route is Full (20/20 slots)'
                                            : 'Approve application'
                                        }
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>{isRouteFull ? 'Route Full' : 'Approve'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReject(app.applicationID)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer whitespace-nowrap"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        <span>Reject</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Route-wise Applied vs Registered Capacity Overview */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
                      <div>
                        <h2 className="font-display text-base font-bold text-[#111C35]">
                          Route Slot &amp; Registration Summary
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Students applied vs. approved registrations per route (20-slot limit;
                          automatically marked Full at 20).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('routes')}
                        className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        Manage routes →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">Route</th>
                            <th className="py-3 px-4">Terminals</th>
                            <th className="py-3 px-4">Students Applied</th>
                            <th className="py-3 px-4">Registered (Approved)</th>
                            <th className="py-3 px-4">Remaining Slots</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {routes.map((r) => {
                            const stats = routeEnrollmentMap[r.routeNumber.toUpperCase()] || {
                              applied: 0,
                              approved: 0,
                            };
                            const remaining = Math.max(0, 20 - stats.approved);
                            const isFull = stats.approved >= 20 || r.status === 'Full';
                            return (
                              <tr key={r.routeNumber} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono font-bold text-[#111C35]">
                                  {r.routeNumber}
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  {r.startLocation} → {r.endLocation}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                                  {stats.applied} applied
                                </td>
                                <td className="py-3 px-4 font-mono font-semibold tabular-nums">
                                  <span className={isFull ? 'text-rose-600' : 'text-emerald-700'}>
                                    {stats.approved} / 20 registered
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                                  {remaining} left
                                </td>
                                <td className="py-3 px-4">
                                  <StatusLabel status={isFull ? 'Full' : r.status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. MANAGE APPLICATIONS */}
              {activeSection === 'applications' && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start">
                      {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setStatusFilter(tab)}
                          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            statusFilter === tab
                              ? 'bg-white text-[#111C35] shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSearchApplications} className="flex items-center gap-2">
                      <div className="relative">
                        <Search
                          className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          value={appSearchQuery}
                          onChange={(e) => setAppSearchQuery(e.target.value)}
                          placeholder="Search Student ID (AP...) or Name"
                          className="w-60 sm:w-64 rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] cursor-pointer"
                      >
                        Search
                      </button>
                      {appSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setAppSearchQuery('');
                            loadAllAdminData();
                          }}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </form>
                  </div>

                  {filteredApplications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-600">
                      No matching bus pass applications found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">App ID</th>
                            <th className="py-3 px-4">Student ID</th>
                            <th className="py-3 px-4">Student Name</th>
                            <th className="py-3 px-4">Department</th>
                            <th className="py-3 px-4">Route</th>
                            <th className="py-3 px-4">Pass Type</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredApplications.map((app) => {
                            const rStats = routeEnrollmentMap[app.route.toUpperCase()] || {
                              applied: 0,
                              approved: 0,
                            };
                            const isRouteFull = rStats.approved >= 20;
                            return (
                              <tr key={app.applicationID} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono font-semibold text-[#111C35] tabular-nums">
                                  #{app.applicationID}
                                </td>
                                <td className="py-3 px-4 font-mono">{app.studentID}</td>
                                <td className="py-3 px-4 font-medium text-[#111C35]">{app.name}</td>
                                <td className="py-3 px-4 text-slate-600">{app.department}</td>
                                <td className="py-3 px-4 font-mono">
                                  {app.route?.trim() || 'Not Assigned'}
                                </td>
                                <td className="py-3 px-4 text-slate-700">
                                  {app.passType?.trim() || 'Not Assigned'}
                                </td>
                                <td className="py-3 px-4">
                                  <StatusLabel status={app.status} />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openAppDetails(app)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>View</span>
                                    </button>
                                    {app.status !== 'Approved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleApprove(app.applicationID)}
                                        disabled={isRouteFull}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>{isRouteFull ? 'Route Full' : 'Approve'}</span>
                                      </button>
                                    )}
                                    {app.status !== 'Rejected' && (
                                      <button
                                        type="button"
                                        onClick={() => handleReject(app.applicationID)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer whitespace-nowrap"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        <span>Reject</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. MANAGE ROUTES (With Applied / Registered Slot Count Analytics) */}
              {activeSection === 'routes' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="font-display text-base font-bold text-[#111C35] mb-4">
                      Add New Bus Route
                    </h2>
                    <form
                      onSubmit={handleAddRoute}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Route Number
                        </label>
                        <input
                          type="text"
                          value={newRouteNumber}
                          onChange={(e) => setNewRouteNumber(e.target.value)}
                          placeholder="e.g., R-106"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Start Location
                        </label>
                        <input
                          type="text"
                          value={newStartLocation}
                          onChange={(e) => setNewStartLocation(e.target.value)}
                          placeholder="Vijayawada"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          End Location
                        </label>
                        <input
                          type="text"
                          value={newEndLocation}
                          onChange={(e) => setNewEndLocation(e.target.value)}
                          placeholder="SRM AP Campus"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                          required
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Boarding Points (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={newBoardingPoints}
                          onChange={(e) => setNewBoardingPoints(e.target.value)}
                          placeholder="Stop A, Stop B, Stop C"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={newRouteStatus}
                          onChange={(e) =>
                            setNewRouteStatus(e.target.value as 'Available' | 'Limited' | 'Full')
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                        >
                          <option value="Available">Available</option>
                          <option value="Limited">Limited</option>
                          <option value="Full">Full</option>
                        </select>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-lg bg-[#EB6B2C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#D95B1E] cursor-pointer whitespace-nowrap"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="font-display text-base font-bold text-[#111C35]">
                        Existing Routes &amp; Slot Capacities ({routes.length})
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">Max Capacity: 20 Slots / Route</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">Route</th>
                            <th className="py-3 px-4">Terminals</th>
                            <th className="py-3 px-4">Applied</th>
                            <th className="py-3 px-4">Registered / Slots (Max 20)</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {routes.map((r) => {
                            const stats = routeEnrollmentMap[r.routeNumber.toUpperCase()] || {
                              applied: 0,
                              approved: 0,
                            };
                            const isFull = stats.approved >= 20 || r.status === 'Full';
                            return (
                              <tr key={r.routeNumber} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-mono font-semibold text-[#111C35]">
                                  {r.routeNumber}
                                </td>
                                <td className="py-3 px-4 text-slate-800">
                                  {r.startLocation} → {r.endLocation}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                                  {stats.applied} student(s) applied
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-700 tabular-nums font-semibold">
                                  <span className={isFull ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                                    {stats.approved} / 20 slots
                                  </span>
                                  <span className="ml-2 text-xs font-normal text-slate-500">
                                    ({Math.max(0, 20 - stats.approved)} left)
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <StatusLabel status={isFull ? 'Full' : r.status} />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingRoute({ ...r })}
                                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRoute(r.routeNumber)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Remove</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. REGISTERED STUDENTS */}
              {activeSection === 'users' && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-base font-bold text-[#111C35]">
                        Registered Students ({students.length})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Search by Student ID (e.g., AP1111111111).
                      </p>
                    </div>

                    <form onSubmit={handleSearchStudents} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={studentSearchId}
                        onChange={(e) => setStudentSearchId(e.target.value)}
                        placeholder="AP1111111111"
                        className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] cursor-pointer"
                      >
                        Search
                      </button>
                      {studentSearchId && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentSearchId('');
                            loadAllAdminData();
                          }}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          All
                        </button>
                      )}
                    </form>
                  </div>

                  {students.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-600">
                      No matching student records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">Student ID</th>
                            <th className="py-3 px-4">Full Name</th>
                            <th className="py-3 px-4">Department</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Contact</th>
                            <th className="py-3 px-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((st) => (
                            <tr key={st.studentID} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono font-semibold text-[#111C35]">
                                {st.studentID}
                              </td>
                              <td className="py-3 px-4 font-medium text-[#111C35]">{st.fullName}</td>
                              <td className="py-3 px-4 text-slate-600">{st.department}</td>
                              <td className="py-3 px-4 text-slate-600">{st.email}</td>
                              <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                                {st.contact}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudent(st)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 5. REPORTS */}
              {activeSection === 'reports' && report && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Registered Students</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-[#111C35] tabular-nums">
                        {report.totalStudents}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Total Applications</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-[#2563EB] tabular-nums">
                        {report.totalApplications}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Approved</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-emerald-600 tabular-nums">
                        {report.approvedApplications}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-amber-600 tabular-nums">
                        {report.pendingApplications}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs text-slate-500">Rejected</p>
                      <p className="mt-1 font-mono text-2xl font-bold text-rose-600 tabular-nums">
                        {report.rejectedApplications}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="font-display text-base font-bold text-[#111C35] mb-1">
                      Route-Wise Application Counts (Max 20 Slots)
                    </h2>
                    <p className="text-xs text-slate-500 mb-5">
                      Computed directly from database storage.
                    </p>

                    {report.routeCounts.length === 0 ? (
                      <p className="text-sm text-slate-600">No route statistics available.</p>
                    ) : (
                      <div className="space-y-4">
                        {report.routeCounts.map((rc) => {
                          const rStats = routeEnrollmentMap[rc.route.toUpperCase()] || {
                            applied: rc.count,
                            approved: rc.count,
                          };
                          const pct = Math.round((rStats.approved / 20) * 100);
                          return (
                            <div key={rc.route} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono font-semibold text-[#111C35]">
                                  Route {rc.route}
                                </span>
                                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                                  {rStats.approved} / 20 registered · {rStats.applied} applied
                                </span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    rStats.approved >= 20 ? 'bg-rose-600' : 'bg-[#2563EB]'
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* APPLICATION DETAILS & UPDATE MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#111C35] px-5 py-3.5 text-white">
              <h3 className="font-display text-sm font-bold">
                Application #{selectedApp.applicationID} Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePass} className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Student Name</span>
                  <span className="font-semibold text-[#111C35]">{selectedApp.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Student ID</span>
                  <span className="font-mono font-semibold text-[#111C35]">
                    {selectedApp.studentID}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department</span>
                  <span className="text-slate-800">{selectedApp.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact</span>
                  <span className="font-mono text-slate-800">{selectedApp.contact}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Route</label>
                  <select
                    value={editRoute}
                    onChange={(e) => {
                      const nextRouteNum = e.target.value;
                      setEditRoute(nextRouteNum);
                      const match = routes.find(
                        (r) => r.routeNumber.toUpperCase() === nextRouteNum.toUpperCase()
                      );
                      if (match && !editBoarding.trim()) {
                        const firstStop = match.boardingPoints.split(',')[0]?.trim() || '';
                        setEditBoarding(firstStop);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
                    required
                  >
                    <option value="">Select Bus Route</option>
                    {routes.map((r) => (
                      <option key={r.routeNumber} value={r.routeNumber}>
                        {r.routeNumber} — {r.startLocation}
                      </option>
                    ))}
                    {editRoute &&
                      !routes.some(
                        (r) => r.routeNumber.toUpperCase() === editRoute.toUpperCase()
                      ) && <option value={editRoute}>{editRoute}</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Boarding Point
                  </label>
                  <input
                    type="text"
                    list="admin-route-stops"
                    value={editBoarding}
                    onChange={(e) => setEditBoarding(e.target.value)}
                    placeholder="Enter boarding point"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    required
                  />
                  <datalist id="admin-route-stops">
                    {(
                      routes
                        .find((r) => r.routeNumber.toUpperCase() === editRoute.toUpperCase())
                        ?.boardingPoints.split(',') || []
                    ).map((stop) => (
                      <option key={stop.trim()} value={stop.trim()} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pass Type
                  </label>
                  <select
                    value={editPassType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditPassType(val);
                      const d = new Date();
                      if (val === 'Semester') {
                        d.setMonth(d.getMonth() + 4);
                      } else {
                        d.setMonth(d.getMonth() + 8);
                      }
                      setEditValidity(d.toISOString().slice(0, 10));
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="Semester">Semester (4 Mo.)</option>
                    <option value="Yearly">Yearly (8 Mo.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validity
                  </label>
                  <input
                    type="date"
                    value={editValidity}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-mono text-slate-700 cursor-not-allowed"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setError('');
                      setFeedback('');
                      try {
                        const msg = await cgiApi.updateApplication({
                          applicationID: selectedApp.applicationID,
                          route: editRoute,
                          boardingPoint: editBoarding,
                          passType: editPassType,
                          validity: editValidity,
                          status: 'Approved',
                        });
                        setFeedback(msg);
                        setSelectedApp(null);
                        await loadAllAdminData();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Approval failed.');
                      }
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setError('');
                      setFeedback('');
                      try {
                        const msg = await cgiApi.updateApplication({
                          applicationID: selectedApp.applicationID,
                          route: editRoute,
                          boardingPoint: editBoarding,
                          passType: editPassType,
                          validity: editValidity,
                          status: 'Rejected',
                        });
                        setFeedback(msg);
                        setSelectedApp(null);
                        await loadAllAdminData();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Rejection failed.');
                      }
                    }}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROUTE MODAL */}
      {editingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#111C35] px-5 py-3.5 text-white">
              <h3 className="font-display text-sm font-bold">
                Update Route {editingRoute.routeNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRoute(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRouteUpdate} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Location</label>
                <input
                  type="text"
                  value={editingRoute.startLocation}
                  onChange={(e) =>
                    setEditingRoute({ ...editingRoute, startLocation: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Location</label>
                <input
                  type="text"
                  value={editingRoute.endLocation}
                  onChange={(e) =>
                    setEditingRoute({ ...editingRoute, endLocation: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Boarding Points</label>
                <input
                  type="text"
                  value={editingRoute.boardingPoints}
                  onChange={(e) =>
                    setEditingRoute({ ...editingRoute, boardingPoints: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Availability</label>
                <select
                  value={editingRoute.status}
                  onChange={(e) => setEditingRoute({ ...editingRoute, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="Available">Available</option>
                  <option value="Limited">Limited</option>
                  <option value="Full">Full</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2563EB] px-4 py-1.5 font-semibold text-white hover:bg-[#1D4ED8] cursor-pointer"
                >
                  Update Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#111C35] px-5 py-3.5 text-white">
              <h3 className="font-display text-sm font-bold">
                Student Profile — {selectedStudent.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5">
                <div>
                  <span className="text-slate-500 block">Student ID</span>
                  <span className="font-mono font-semibold text-[#111C35]">
                    {selectedStudent.studentID}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department</span>
                  <span className="font-semibold text-[#111C35]">{selectedStudent.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="text-slate-800">{selectedStudent.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact</span>
                  <span className="font-mono text-slate-800 tabular-nums">
                    {selectedStudent.contact}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-display text-sm font-bold text-[#111C35] mb-2">
                  Submitted Applications
                </h4>
                {applications.filter(
                  (a) => a.studentID.toUpperCase() === selectedStudent.studentID.toUpperCase()
                ).length === 0 ? (
                  <p className="text-slate-600">No bus pass applications submitted.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {applications
                      .filter(
                        (a) => a.studentID.toUpperCase() === selectedStudent.studentID.toUpperCase()
                      )
                      .map((app) => (
                        <div
                          key={app.applicationID}
                          className="p-3 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-semibold text-[#111C35]">
                              App #{app.applicationID} · Route {app.route}
                            </p>
                            <p className="text-slate-600">
                              {app.boardingPoint} · {app.passType} · Valid {app.validity}
                            </p>
                          </div>
                          <StatusLabel status={app.status} />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-lg bg-[#111C35] px-4 py-1.5 font-semibold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
