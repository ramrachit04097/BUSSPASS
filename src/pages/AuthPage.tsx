import { useState, type FormEvent } from 'react';
import { ArrowLeft, ShieldCheck, UserCheck, UserPlus } from 'lucide-react';
import { cgiApi } from '../api/cgiClient';
import { AppLogo } from '../components/AppLogo';
import type { AdminUser, StudentUser } from '../types';

export type AuthMode = 'student-login' | 'student-register' | 'admin-login';

interface AuthPageProps {
  initialMode: AuthMode;
  onBackHome: () => void;
  onStudentLoginSuccess: (student: StudentUser) => void;
  onAdminLoginSuccess: (admin: AdminUser) => void;
}

export function AuthPage({
  initialMode,
  onBackHome,
  onStudentLoginSuccess,
  onAdminLoginSuccess,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Student Login State
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Student Registration State
  const [fullName, setFullName] = useState('');
  const [studentID, setStudentID] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin Login State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setSuccessMsg('');
  };

  const handleStudentLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!studentIdentifier.trim() || !studentPassword.trim()) {
      setError('Please enter your Student ID and password.');
      return;
    }
    setSubmitting(true);
    try {
      const student = await cgiApi.loginStudent(studentIdentifier.trim(), studentPassword);
      onStudentLoginSuccess(student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStudentRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (
      !fullName.trim() ||
      !studentID.trim() ||
      !department.trim() ||
      !email.trim() ||
      !contact.trim() ||
      !regPassword
    ) {
      setError('Please complete all required registration fields.');
      return;
    }
    if (studentID.trim().length < 4) {
      setError('Please enter a valid Student ID (e.g., AP1111111111).');
      return;
    }
    if (regPassword !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }
    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await cgiApi.registerStudent({
        studentID: studentID.trim().toUpperCase(),
        fullName: fullName.trim(),
        department: department.trim(),
        email: email.trim(),
        contact: contact.trim(),
        password: regPassword,
      });
      setSuccessMsg(`${res.message} Redirecting to your dashboard...`);
      setTimeout(() => {
        onStudentLoginSuccess(res.student);
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setError('Please enter administrator username and password.');
      return;
    }
    setSubmitting(true);
    try {
      const admin = await cgiApi.loginAdmin(adminUsername.trim(), adminPassword);
      onAdminLoginSuccess(admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-4">
          <button
            type="button"
            onClick={onBackHome}
            className="flex items-center gap-2.5 font-display text-lg font-extrabold text-[#111C35] cursor-pointer"
          >
            <AppLogo className="h-10 w-10" />
            <span>BUSPASS</span>
          </button>

          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#111C35] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Role / Mode Tabs */}
          <div className="grid grid-cols-3 border-b border-slate-200 bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => switchMode('student-login')}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'student-login'
                  ? 'border-[#2563EB] bg-white text-[#111C35]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              <span>Student Login</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('student-register')}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'student-register'
                  ? 'border-[#EB6B2C] bg-white text-[#111C35]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Register</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('admin-login')}
              className={`flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'admin-login'
                  ? 'border-[#111C35] bg-white text-[#111C35]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Admin Login</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {successMsg}
              </div>
            )}

            {/* STUDENT LOGIN */}
            {mode === 'student-login' && (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#EB6B2C]">
                    SRM UNIVERSITY AP
                  </p>
                  <h1 className="font-display text-xl font-bold text-[#111C35] mt-1">
                    Student Sign In
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Sign in using your Student ID or registered university email.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Student ID or Email
                  </label>
                  <input
                    type="text"
                    value={studentIdentifier}
                    onChange={(e) => setStudentIdentifier(e.target.value)}
                    placeholder="AP1111111111"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting ? 'Signing In...' : 'Login'}
                </button>

                <p className="text-center text-xs text-slate-600 pt-1">
                  New student?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('student-register')}
                    className="font-semibold text-[#EB6B2C] hover:underline cursor-pointer"
                  >
                    Register with your Student ID
                  </button>
                </p>
              </form>
            )}

            {/* STUDENT REGISTRATION */}
            {mode === 'student-register' && (
              <form onSubmit={handleStudentRegister} className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#EB6B2C]">
                    SRM UNIVERSITY AP
                  </p>
                  <h1 className="font-display text-xl font-bold text-[#111C35] mt-1">
                    Student Account Registration
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Create your account to apply for and manage your bus pass.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={studentID}
                      onChange={(e) => setStudentID(e.target.value.toUpperCase())}
                      placeholder="AP1111111111"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Business Administration">Business Administration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@srmap.edu.in"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-[#EB6B2C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D95B1E] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting ? 'Creating Account...' : 'Register & Continue'}
                </button>
              </form>
            )}

            {/* ADMIN LOGIN */}
            {mode === 'admin-login' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#EB6B2C]">
                    SRM UNIVERSITY AP
                  </p>
                  <h1 className="font-display text-xl font-bold text-[#111C35] mt-1">
                    Administrator Sign In
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Sign in to review applications, manage routes, and view reports.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#111C35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2E54] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {submitting ? 'Verifying...' : 'Login to Admin Console'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
