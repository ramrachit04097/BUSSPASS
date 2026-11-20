import { useState } from 'react';
import { PublicHomePage } from './pages/PublicHomePage';
import { AuthPage, type AuthMode } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DigitalTicketPage } from './pages/DigitalTicketPage';
import type { AdminUser, BusPassRecord, StudentUser } from './types';

type AppView =
  | { page: 'home' }
  | { page: 'auth'; mode: AuthMode }
  | { page: 'student'; student: StudentUser }
  | { page: 'admin'; admin: AdminUser }
  | { page: 'ticket'; pass: BusPassRecord };

function getInitialView(): AppView {
  if (typeof window === 'undefined') return { page: 'home' };
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'ticket') {
    const appId = Number(params.get('appId') || '0');
    const studentId = params.get('studentId') || '';
    if (appId > 0 || studentId) {
      return {
        page: 'ticket',
        pass: {
          applicationID: appId,
          studentID: studentId,
          name: params.get('name') || 'Student',
          department: params.get('dept') || 'SRM University AP',
          contact: '',
          email: '',
          route: params.get('route') || '',
          boardingPoint: params.get('stop') || '',
          passType: params.get('type') || '',
          validity: params.get('valid') || '',
          status: params.get('status') || 'Pending',
        },
      };
    }
  }
  return { page: 'home' };
}

export default function App() {
  const [view, setView] = useState<AppView>(getInitialView);

  if (view.page === 'ticket') {
    return (
      <DigitalTicketPage
        initialPass={view.pass}
        onBackPortal={() => {
          window.history.replaceState({}, '', '/');
          setView({ page: 'home' });
        }}
      />
    );
  }

  if (view.page === 'student') {
    return (
      <StudentDashboard
        student={view.student}
        onLogout={() => {
          setView({ page: 'home' });
        }}
      />
    );
  }

  if (view.page === 'admin') {
    return (
      <AdminDashboard
        admin={view.admin}
        onLogout={() => {
          setView({ page: 'home' });
        }}
      />
    );
  }

  if (view.page === 'auth') {
    return (
      <AuthPage
        initialMode={view.mode}
        onBackHome={() => {
          setView({ page: 'home' });
        }}
        onStudentLoginSuccess={(student) => {
          setView({ page: 'student', student });
        }}
        onAdminLoginSuccess={(admin) => {
          setView({ page: 'admin', admin });
        }}
      />
    );
  }

  return (
    <PublicHomePage
      onNavigateAuth={(mode) => {
        setView({ page: 'auth', mode });
      }}
    />
  );
}
