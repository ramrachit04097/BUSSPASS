import { useState, useEffect } from 'react';
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

  const storedStudent = localStorage.getItem('srmap_buspass_current_student');
  if (storedStudent) {
    try {
      const student = JSON.parse(storedStudent);
      if (student && student.studentID) {
        return { page: 'student', student };
      }
    } catch {}
  }

  const storedAdmin = localStorage.getItem('srmap_buspass_current_admin');
  if (storedAdmin) {
    try {
      const admin = JSON.parse(storedAdmin);
      if (admin && admin.username) {
        return { page: 'admin', admin };
      }
    } catch {}
  }

  return { page: 'home' };
}

export default function App() {
  const [view, setView] = useState<AppView>(getInitialView);

  useEffect(() => {
    const handlePopState = () => {
      const current = getInitialView();
      if (current.page === 'ticket') {
        setView(current);
        return;
      }
      const storedStudent = localStorage.getItem('srmap_buspass_current_student');
      if (storedStudent) {
        try {
          setView({ page: 'student', student: JSON.parse(storedStudent) });
          return;
        } catch {}
      }
      const storedAdmin = localStorage.getItem('srmap_buspass_current_admin');
      if (storedAdmin) {
        try {
          setView({ page: 'admin', admin: JSON.parse(storedAdmin) });
          return;
        } catch {}
      }
      setView({ page: 'home' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleBackFromTicket = () => {
    const storedStudent = localStorage.getItem('srmap_buspass_current_student');
    if (storedStudent) {
      try {
        const student = JSON.parse(storedStudent);
        window.history.replaceState({}, '', '/');
        setView({ page: 'student', student });
        return;
      } catch {}
    }
    const storedAdmin = localStorage.getItem('srmap_buspass_current_admin');
    if (storedAdmin) {
      try {
        const admin = JSON.parse(storedAdmin);
        window.history.replaceState({}, '', '/');
        setView({ page: 'admin', admin });
        return;
      } catch {}
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.history.replaceState({}, '', '/');
      setView({ page: 'home' });
    }
  };

  if (view.page === 'ticket') {
    return (
      <DigitalTicketPage
        initialPass={view.pass}
        onBackPortal={handleBackFromTicket}
      />
    );
  }

  if (view.page === 'student') {
    return (
      <StudentDashboard
        student={view.student}
        onLogout={() => {
          localStorage.removeItem('srmap_buspass_current_student');
          window.history.pushState({}, '', '/');
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
          localStorage.removeItem('srmap_buspass_current_admin');
          window.history.pushState({}, '', '/');
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
          window.history.pushState({}, '', '/');
          setView({ page: 'home' });
        }}
        onStudentLoginSuccess={(student) => {
          localStorage.setItem('srmap_buspass_current_student', JSON.stringify(student));
          localStorage.removeItem('srmap_buspass_current_admin');
          window.history.pushState({}, '', '/');
          setView({ page: 'student', student });
        }}
        onAdminLoginSuccess={(admin) => {
          localStorage.setItem('srmap_buspass_current_admin', JSON.stringify(admin));
          localStorage.removeItem('srmap_buspass_current_student');
          window.history.pushState({}, '', '/');
          setView({ page: 'admin', admin });
        }}
      />
    );
  }

  return (
    <PublicHomePage
      onNavigateAuth={(mode) => {
        window.history.pushState({}, '', '/');
        setView({ page: 'auth', mode });
      }}
    />
  );
}
