import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import { cgiApi } from '../api/cgiClient';
import type { BusPassRecord, BusRouteRecord, StudentUser } from '../types';
import { StatusLabel } from '../components/StatusLabel';
import { DigitalBusPassCard } from '../components/DigitalBusPassCard';
import { AppLogo } from '../components/AppLogo';

type StudentSection = 'dashboard' | 'apply' | 'applications' | 'buspass' | 'renew';

interface StudentDashboardProps {
  student: StudentUser;
  onLogout: () => void;
}

function computeValidityDate(passType: string): string {
  const d = new Date();
  if (passType === 'Semester') {
    d.setMonth(d.getMonth() + 4); // Semester: 4 months after applying
  } else {
    d.setMonth(d.getMonth() + 8); // Yearly: 8 months after applying
  }
  return d.toISOString().slice(0, 10);
}

export function StudentDashboard({ student, onLogout }: StudentDashboardProps) {
  const [activeSection, setActiveSection] = useState<StudentSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [applications, setApplications] = useState<BusPassRecord[]>([]);
  const [routes, setRoutes] = useState<BusRouteRecord[]>([]);
  const [generatedPass, setGeneratedPass] = useState<BusPassRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Apply form state (Pass Type: Semester or Yearly only; validity auto-calculated)
  const [selectedRoute, setSelectedRoute] = useState('');
  const [boardingPoint, setBoardingPoint] = useState('');
  const [passType, setPassType] = useState<'Semester' | 'Yearly'>('Semester');
  const [validity, setValidity] = useState(computeValidityDate('Semester'));
  const [submittingApp, setSubmittingApp] = useState(false);

  // Renew pass form state
  const [renewPassId, setRenewPassId] = useState<number>(0);
  const [renewType, setRenewType] = useState<'Semester' | 'Yearly'>('Semester');
  const [renewValidity, setRenewValidity] = useState(computeValidityDate('Semester'));
  const [submittingRenew, setSubmittingRenew] = useState(false);

  const loadStudentData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [appsData, routesData, passData] = await Promise.all([
        cgiApi.getApplications({ studentID: student.studentID }),
        cgiApi.getRoutes(),
        cgiApi.generatePass(student.studentID),
      ]);
      setApplications(appsData);
      setRoutes(routesData);
      setGeneratedPass(passData.pass);

      const firstAvailableRoute =
        routesData.find((r) => r.status !== 'Full')?.routeNumber ||
        routesData[0]?.routeNumber ||
        '';
      setSelectedRoute((prev) => prev || firstAvailableRoute);

      const firstApproved = appsData.find((a) => a.status === 'Approved');
      if (firstApproved) {
        setRenewPassId(firstApproved.applicationID);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student data.');
    } finally {
      setLoading(false);
    }
  }, [student.studentID]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const selectedRouteObj = useMemo(
    () => routes.find((r) => r.routeNumber === selectedRoute),
    [routes, selectedRoute]
  );

  const routeStops = useMemo(() => {
    if (!selectedRouteObj) return [];
    return selectedRouteObj.boardingPoints
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedRouteObj]);

  useEffect(() => {
    if (routeStops.length > 0 && !routeStops.includes(boardingPoint)) {
      setBoardingPoint(routeStops[0]);
    }
  }, [routeStops, boardingPoint]);

  const latestApplication = useMemo(() => {
    if (applications.length === 0) return null;
    return applications[applications.length - 1];
  }, [applications]);

  const activeApprovedPass = useMemo(() => {
    const approved = applications.filter((a) => a.status === 'Approved');
    return approved.length > 0 ? approved[approved.length - 1] : null;
  }, [applications]);

  const activeOrPendingPass = useMemo(
    () => applications.find((a) => a.status === 'Pending' || a.status === 'Approved') || null,
    [applications]
  );

  const primaryDisplayPass = activeApprovedPass || generatedPass || latestApplication;

  const activeRouteDetails = useMemo(() => {
    if (!primaryDisplayPass || !primaryDisplayPass.route) return null;
    return (
      routes.find(
        (r) => r.routeNumber.toUpperCase() === primaryDisplayPass.route.toUpperCase()
      ) || null
    );
  }, [primaryDisplayPass, routes]);

  const notifications = useMemo(() => {
    return applications
      .slice()
      .reverse()
      .map((app) => ({
        id: app.applicationID,
        title: `Application #${app.applicationID} (${app.route?.trim() || 'No Route'})`,
        detail:
          app.status === 'Approved'
            ? `Approved${app.passType ? ` for ${app.passType} pass` : ''}${app.validity ? ` until ${app.validity}` : ''}.`
            : app.status === 'Rejected'
              ? 'Application declined. You may submit a new application.'
              : 'Submitted and awaiting Transport Administrator review.',
        status: app.status,
      }));
  }, [applications]);

  const handleApplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');

    if (!selectedRoute || !boardingPoint.trim() || !passType || !validity) {
      setError('Please select a route, boarding point, and pass type.');
      return;
    }

    setSubmittingApp(true);
    try {
      const res = await cgiApi.submitApplication({
        studentID: student.studentID,
        name: student.fullName,
        department: student.department,
        contact: student.contact,
        email: student.email,
        route: selectedRoute,
        boardingPoint: boardingPoint.trim(),
        passType,
        validity,
      });
      setFeedback(
        `${res.message} Application ID #${res.application.applicationID} is now Pending review.`
      );
      await loadStudentData();
      setActiveSection('applications');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application.');
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleRenewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');

    if (!renewPassId) {
      setError('No approved bus pass selected for renewal.');
      return;
    }

    setSubmittingRenew(true);
    try {
      const res = await cgiApi.renewPass({
        applicationID: renewPassId,
        studentID: student.studentID,
        passType: renewType,
        validity: renewValidity,
      });
      setFeedback(res.message);
      await loadStudentData();
      setActiveSection('applications');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit renewal.');
    } finally {
      setSubmittingRenew(false);
    }
  };

  const navItems: { id: StudentSection; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'apply', label: 'Apply for Pass', icon: FileText },
    { id: 'applications', label: 'My Applications', icon: ClipboardList },
    { id: 'buspass', label: 'My Bus Pass', icon: CreditCard },
    { id: 'renew', label: 'Renew Pass', icon: RefreshCw },
  ];

  const sectionTitles: Record<StudentSection, string> = {
    dashboard: 'Student Dashboard',
    apply: 'Apply for Bus Pass',
    applications: 'My Applications',
    buspass: 'My Digital Bus Pass',
    renew: 'Renew Bus Pass',
  };

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
            <AppLogo className="h-10 w-10" />
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

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications((v) => !v);
                    setShowProfileMenu(false);
                  }}
                  className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-[#111C35] transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EB6B2C] px-1 text-[10px] font-bold text-white tabular-nums">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-[#111C35]">Notifications</span>
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500">
                          No pass updates yet. Apply for a bus pass to track status here.
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-3.5 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[#111C35]">{n.title}</span>
                              <StatusLabel status={n.status} />
                            </div>
                            <p className="text-slate-600 leading-relaxed">{n.detail}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu((v) => !v);
                    setShowNotifications(false);
                  }}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB]">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-[#111C35] whitespace-nowrap">
                      {student.fullName}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {student.studentID}
                    </p>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg z-50 text-xs space-y-2">
                    <p className="font-display text-sm font-bold text-[#111C35]">
                      {student.fullName}
                    </p>
                    <p className="text-slate-600">
                      Student ID:{' '}
                      <span className="font-mono font-semibold text-[#111C35]">
                        {student.studentID}
                      </span>
                    </p>
                    <p className="text-slate-600">Department: {student.department}</p>
                    <p className="text-slate-600">Email: {student.email}</p>
                    <p className="text-slate-600">
                      Contact: <span className="font-mono">{student.contact}</span>
                    </p>
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={onLogout}
                        className="w-full rounded-lg border border-slate-200 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
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

          {loading ? (
            <div className="space-y-4">
              <div className="h-24 rounded-2xl border border-slate-200 bg-white animate-pulse" />
              <div className="h-52 rounded-2xl border border-slate-200 bg-white animate-pulse" />
            </div>
          ) : (
            <>
              {/* 1. DASHBOARD OVERVIEW */}
              {activeSection === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-3.5 shadow-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2563EB]">
                        <User className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Student Profile</p>
                        <p className="mt-0.5 font-display text-sm font-bold text-[#111C35] truncate">
                          {student.fullName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          <span className="font-mono font-semibold text-[#111C35]">
                            {student.studentID}
                          </span>{' '}
                          · {student.department}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-3.5 shadow-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500">Pass Status</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          {primaryDisplayPass ? (
                            <StatusLabel status={primaryDisplayPass.status} />
                          ) : (
                            <span className="text-sm font-semibold text-slate-700">
                              Not Applied
                            </span>
                          )}
                          {primaryDisplayPass && (
                            <span className="font-mono text-xs text-slate-500 tabular-nums">
                              #{primaryDisplayPass.applicationID}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {applications.length} application(s) submitted
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-3.5 shadow-sm">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#EB6B2C]">
                        <MapPin className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">Route &amp; Validity</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-[#111C35]">
                          {primaryDisplayPass
                            ? primaryDisplayPass.route?.trim() || 'Not Assigned'
                            : 'No Route Selected'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {primaryDisplayPass
                            ? primaryDisplayPass.validity?.trim()
                              ? `Valid until ${primaryDisplayPass.validity}`
                              : 'Validity Not Assigned'
                            : 'Apply for a campus shuttle route'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Digital Bus Pass Card */}
                  {primaryDisplayPass ? (
                    <DigitalBusPassCard pass={primaryDisplayPass} />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                      <p className="font-display text-base font-bold text-[#111C35]">
                        Ready to Apply for Your Campus Bus Pass?
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Choose your route and boarding point to generate your digital bus pass.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSection('apply')}
                        className="mt-5 rounded-full bg-[#EB6B2C] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D95B1E] transition-colors cursor-pointer shadow-sm"
                      >
                        Apply for Bus Pass
                      </button>
                    </div>
                  )}

                  {/* Assigned Route Details */}
                  {primaryDisplayPass && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h2 className="font-display text-sm font-bold text-[#111C35]">
                          Assigned Route Details
                        </h2>
                        <span className="font-mono text-xs font-semibold text-[#2563EB]">
                          Route {primaryDisplayPass.route?.trim() || 'Not Assigned'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 block">Boarding Point</span>
                          <span className="font-semibold text-[#111C35]">
                            {primaryDisplayPass.boardingPoint?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Pass Type</span>
                          <span className="font-semibold text-[#111C35]">
                            {primaryDisplayPass.passType?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Valid Until</span>
                          <span className="font-mono font-semibold text-[#111C35]">
                            {primaryDisplayPass.validity?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                        {activeRouteDetails && (
                          <div>
                            <span className="text-slate-500 block">Route Terminals</span>
                            <span className="font-medium text-[#111C35]">
                              {activeRouteDetails.startLocation} → {activeRouteDetails.endLocation}
                            </span>
                          </div>
                        )}
                      </div>
                      {activeRouteDetails && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                          <span className="text-slate-500 block">All Boarding Stops</span>
                          <span className="text-slate-700">
                            {activeRouteDetails.boardingPoints
                              .split(',')
                              .map((s) => s.trim())
                              .join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. APPLY FOR BUS PASS */}
              {activeSection === 'apply' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
                  <h2 className="font-display text-lg font-bold text-[#111C35]">
                    Bus Pass Registration Form
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Select your route and pass type (Semester = 4 Months, Yearly = 8 Months). Only
                    one active pass application is allowed at a time.
                  </p>

                  {activeOrPendingPass ? (
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-sm font-bold text-amber-950">
                            One Pass Application Limit Active
                          </h3>
                          <p className="mt-1 text-xs text-amber-900 leading-relaxed">
                            You already have an active{' '}
                            <strong>{activeOrPendingPass.status}</strong> pass application (
                            <span className="font-mono">#{activeOrPendingPass.applicationID}</span>
                            ). Students can apply for only one bus pass at a time.
                          </p>
                        </div>
                        <StatusLabel status={activeOrPendingPass.status} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-white border border-amber-200/70 p-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Route</span>
                          <span className="font-mono font-bold text-[#111C35]">
                            {activeOrPendingPass.route?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Boarding Point</span>
                          <span className="font-semibold text-[#111C35]">
                            {activeOrPendingPass.boardingPoint?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Pass Type</span>
                          <span className="font-semibold text-[#111C35]">
                            {activeOrPendingPass.passType?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Valid Until</span>
                          <span className="font-mono font-semibold text-[#111C35]">
                            {activeOrPendingPass.validity?.trim() || 'Not Assigned'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveSection('buspass')}
                          className="rounded-lg bg-[#111C35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E2E52] cursor-pointer"
                        >
                          View Digital Bus Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection('applications')}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          View My Applications
                        </button>
                      </div>
                    </div>
                  ) : (
                  <form onSubmit={handleApplySubmit} className="mt-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-[#F8FAFC] p-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Student ID</span>
                        <span className="font-mono font-bold text-[#111C35]">
                          {student.studentID}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Student Name</span>
                        <span className="font-semibold text-[#111C35]">{student.fullName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Department</span>
                        <span className="text-slate-700">{student.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Contact</span>
                        <span className="font-mono text-slate-700">{student.contact}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Route Selection
                        </label>
                        <select
                          value={selectedRoute}
                          onChange={(e) => setSelectedRoute(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                          required
                        >
                          <option value="">Select Bus Route</option>
                          {routes.map((r) => (
                            <option
                              key={r.routeNumber}
                              value={r.routeNumber}
                              disabled={r.status === 'Full'}
                            >
                              {r.routeNumber} — {r.startLocation} to {r.endLocation} ({r.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Boarding Point
                        </label>
                        {routeStops.length > 0 ? (
                          <select
                            value={boardingPoint}
                            onChange={(e) => setBoardingPoint(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                            required
                          >
                            {routeStops.map((stop) => (
                              <option key={stop} value={stop}>
                                {stop}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={boardingPoint}
                            onChange={(e) => setBoardingPoint(e.target.value)}
                            placeholder="Enter boarding stop"
                            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Pass Type (Semester = 4 Mo. / Yearly = 8 Mo.)
                        </label>
                        <select
                          value={passType}
                          onChange={(e) => {
                            const val = e.target.value as 'Semester' | 'Yearly';
                            setPassType(val);
                            setValidity(computeValidityDate(val));
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                          required
                        >
                          <option value="Semester">Semester (4 Months)</option>
                          <option value="Yearly">Yearly (8 Months)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Valid Until (Auto-Calculated)
                        </label>
                        <input
                          type="date"
                          value={validity}
                          readOnly
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-700 cursor-not-allowed"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={submittingApp}
                        className="rounded-full bg-[#EB6B2C] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D95B1E] disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {submittingApp ? 'Submitting...' : 'Submit Application'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSection('dashboard')}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                  )}
                </div>
              )}

              {/* 3. MY APPLICATIONS */}
              {activeSection === 'applications' && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
                    <div>
                      <h2 className="font-display text-base font-bold text-[#111C35]">
                        My Submitted Applications
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Student ID: <span className="font-mono">{student.studentID}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(activeOrPendingPass)}
                      onClick={() => setActiveSection('apply')}
                      title={
                        activeOrPendingPass
                          ? 'Only one bus pass application is allowed at a time'
                          : 'Submit a new bus pass application'
                      }
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {activeOrPendingPass ? 'Active Pass Limit Reached' : 'New Application'}
                    </button>
                  </div>

                  {applications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-600">
                      You have not submitted any bus pass applications yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">Application ID</th>
                            <th className="py-3 px-4">Route</th>
                            <th className="py-3 px-4">Boarding Point</th>
                            <th className="py-3 px-4">Pass Type</th>
                            <th className="py-3 px-4">Validity</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {applications.map((app) => (
                            <tr key={app.applicationID} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-mono font-semibold text-[#111C35] tabular-nums">
                                #{app.applicationID}
                              </td>
                              <td className="py-3 px-4 font-mono">
                                {app.route?.trim() || 'Not Assigned'}
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {app.boardingPoint?.trim() || 'Not Assigned'}
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {app.passType?.trim() || 'Not Assigned'}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                                {app.validity?.trim() || 'Not Assigned'}
                              </td>
                              <td className="py-3 px-4">
                                <StatusLabel status={app.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 4. MY BUS PASS */}
              {activeSection === 'buspass' && (
                <div>
                  {primaryDisplayPass ? (
                    <DigitalBusPassCard pass={primaryDisplayPass} />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                      <p className="font-display text-base font-bold text-[#111C35]">
                        No Digital Bus Pass Available
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Submit an application and wait for admin approval to view your digital
                        pass.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSection('apply')}
                        className="mt-4 rounded-full bg-[#EB6B2C] px-5 py-2 text-xs font-semibold text-white hover:bg-[#D95B1E] cursor-pointer"
                      >
                        Apply for Bus Pass
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 5. RENEW PASS */}
              {activeSection === 'renew' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-xl">
                  <h2 className="font-display text-lg font-bold text-[#111C35]">
                    Renew Existing Bus Pass
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Extend the validity of an approved bus pass (Semester = 4 Mo. / Yearly = 8 Mo.).
                  </p>

                  {applications.filter((a) => a.status === 'Approved').length === 0 ? (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 text-sm text-slate-600">
                      You do not have an Approved bus pass eligible for renewal yet.
                    </div>
                  ) : (
                    <form onSubmit={handleRenewSubmit} className="mt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Approved Pass to Renew
                        </label>
                        <select
                          value={renewPassId}
                          onChange={(e) => setRenewPassId(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                          required
                        >
                          {applications
                            .filter((a) => a.status === 'Approved')
                            .map((a) => (
                              <option key={a.applicationID} value={a.applicationID}>
                                App #{a.applicationID} — Route {a.route} ({a.boardingPoint}) ·
                                Expiry: {a.validity}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Renewal Pass Type
                          </label>
                          <select
                            value={renewType}
                            onChange={(e) => {
                              const val = e.target.value as 'Semester' | 'Yearly';
                              setRenewType(val);
                              setRenewValidity(computeValidityDate(val));
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                            required
                          >
                            <option value="Semester">Semester (4 Months)</option>
                            <option value="Yearly">Yearly (8 Months)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            New Validity Date (Auto-Calculated)
                          </label>
                          <input
                            type="date"
                            value={renewValidity}
                            readOnly
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-700 cursor-not-allowed"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingRenew}
                        className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {submittingRenew ? 'Submitting Renewal...' : 'Submit Renewal Request'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
