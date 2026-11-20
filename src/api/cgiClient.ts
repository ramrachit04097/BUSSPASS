import type {
  AdminReportData,
  AdminUser,
  BusPassRecord,
  BusRouteRecord,
  StudentUser,
} from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { generateDigitalTicketImage } from '../lib/ticketImageGenerator';

const DEFAULT_ROUTES: BusRouteRecord[] = [
  { routeNumber: 'R-101', startLocation: 'Vijayawada', endLocation: 'SRM AP Campus', boardingPoints: 'Benz Circle, RMV Center, Mangalagiri, University Main Gate', status: 'Available' },
  { routeNumber: 'R-102', startLocation: 'Guntur', endLocation: 'SRM AP Campus', boardingPoints: 'Collector Office, Arundelpet, Namburu, University Gate', status: 'Available' },
  { routeNumber: 'R-103', startLocation: 'Tenali', endLocation: 'SRM AP Campus', boardingPoints: 'Tenali Railway Station, Chebrolu, Pedakakani, University Gate', status: 'Available' },
  { routeNumber: 'R-104', startLocation: 'Vijayawada Bypass', endLocation: 'SRM AP Campus', boardingPoints: 'Gunadala, Ramavarapupadu, Autonagar, University Gate', status: 'Limited' },
  { routeNumber: 'R-105', startLocation: 'Amaravati', endLocation: 'SRM AP Campus', boardingPoints: 'Velagapudi, Secretariat, Inavolu, University Gate', status: 'Available' },
];

const LS_STUDENTS = 'buspass_students_v2';
const LS_APPS = 'buspass_apps_v2';
const LS_ROUTES = 'buspass_routes_v2';

function getLocalStudents(): StudentUser[] {
  try {
    const raw = localStorage.getItem(LS_STUDENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStudents(students: StudentUser[]): void {
  localStorage.setItem(LS_STUDENTS, JSON.stringify(students));
}

function getLocalApps(): BusPassRecord[] {
  try {
    const raw = localStorage.getItem(LS_APPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalApps(apps: BusPassRecord[]): void {
  localStorage.setItem(LS_APPS, JSON.stringify(apps));
}

function getLocalRoutes(): BusRouteRecord[] {
  try {
    const raw = localStorage.getItem(LS_ROUTES);
    if (!raw) {
      saveLocalRoutes(DEFAULT_ROUTES);
      return DEFAULT_ROUTES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ROUTES;
  }
}

function saveLocalRoutes(routes: BusRouteRecord[]): void {
  localStorage.setItem(LS_ROUTES, JSON.stringify(routes));
}

const MAX_ROUTE_SLOTS = 20;

async function syncRouteFullStatus(routeNumber: string, apps?: BusPassRecord[]): Promise<void> {
  if (!routeNumber.trim()) return;
  const allApps = apps || (await cgiApi.getApplications());
  const approvedCount = allApps.filter(
    (a) => a.route.toUpperCase() === routeNumber.toUpperCase() && a.status === 'Approved'
  ).length;

  const client = getSupabaseClient();
  const localRoutes = getLocalRoutes();
  const idx = localRoutes.findIndex((r) => r.routeNumber.toUpperCase() === routeNumber.toUpperCase());
  const currentStatus = idx !== -1 ? localRoutes[idx].status : 'Available';

  let nextStatus = currentStatus;
  if (approvedCount >= MAX_ROUTE_SLOTS) {
    nextStatus = 'Full';
  } else if (currentStatus === 'Full' && approvedCount < MAX_ROUTE_SLOTS) {
    nextStatus = 'Available';
  }

  if (nextStatus !== currentStatus) {
    if (idx !== -1) {
      localRoutes[idx] = { ...localRoutes[idx], status: nextStatus };
      saveLocalRoutes(localRoutes);
    }
    if (client) {
      await client
        .from('routes')
        .update({ status: nextStatus })
        .eq('route_number', routeNumber);
    }
  }
}

export const cgiApi = {
  getRoutes: async (): Promise<BusRouteRecord[]> => {
    const client = getSupabaseClient();
    let routes = getLocalRoutes();
    if (client) {
      const { data, error } = await client.from('routes').select('*');
      if (!error && data) {
        if (data.length > 0) {
          routes = data.map((r: any) => ({
            routeNumber: r.route_number,
            startLocation: r.start_location,
            endLocation: r.end_location,
            boardingPoints: r.boarding_points,
            status: r.status,
          }));
          saveLocalRoutes(routes);
        } else {
          // Seed DEFAULT_ROUTES into Supabase routes table if empty
          try {
            await client.from('routes').upsert(
              DEFAULT_ROUTES.map((r) => ({
                route_number: r.routeNumber,
                start_location: r.startLocation,
                end_location: r.endLocation,
                boarding_points: r.boardingPoints,
                status: r.status,
              })),
              { onConflict: 'route_number', ignoreDuplicates: true }
            );
          } catch {
            // Keep local DEFAULT_ROUTES fallback silently
          }
        }
      }
    }

    // Automatically enforce 20-slot capacity per route
    const apps = await cgiApi.getApplications();
    return routes.map((r) => {
      const approvedCount = apps.filter(
        (a) => a.route.toUpperCase() === r.routeNumber.toUpperCase() && a.status === 'Approved'
      ).length;
      if (approvedCount >= MAX_ROUTE_SLOTS) {
        return { ...r, status: 'Full' };
      }
      if (r.status === 'Full' && approvedCount < MAX_ROUTE_SLOTS) {
        return { ...r, status: 'Available' };
      }
      return r;
    });
  },

  registerStudent: async (payload: {
    studentID: string;
    fullName: string;
    department: string;
    email: string;
    contact: string;
    password: string;
  }): Promise<{ student: StudentUser; message: string }> => {
    const cleanId = payload.studentID.trim().toUpperCase();
    const client = getSupabaseClient();

    if (client) {
      const { data: existing } = await client
        .from('students')
        .select('*')
        .ilike('student_id', cleanId)
        .maybeSingle();

      if (existing) {
        throw new Error('A student account with this Student ID already exists.');
      }

      const { error } = await client.from('students').insert({
        student_id: cleanId,
        full_name: payload.fullName.trim(),
        department: payload.department.trim(),
        email: payload.email.trim(),
        contact: payload.contact.trim(),
        password: payload.password,
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }
    }

    const students = getLocalStudents();
    if (!client && students.some((s) => s.studentID.toUpperCase() === cleanId)) {
      throw new Error('A student account with this Student ID already exists.');
    }

    const newStudent: StudentUser = {
      studentID: cleanId,
      fullName: payload.fullName.trim(),
      department: payload.department.trim(),
      email: payload.email.trim(),
      contact: payload.contact.trim(),
    };
    const filtered = students.filter((s) => s.studentID.toUpperCase() !== cleanId);
    filtered.push(newStudent);
    saveLocalStudents(filtered);

    return { student: newStudent, message: 'Student registered successfully in database.' };
  },

  loginStudent: async (identifier: string, password: string): Promise<StudentUser> => {
    const cleanId = identifier.trim().toUpperCase();
    const client = getSupabaseClient();

    if (client) {
      const { data, error } = await client
        .from('students')
        .select('*')
        .or(`student_id.ilike.${cleanId},email.ilike.${cleanId}`)
        .maybeSingle();

      if (!error && data) {
        if (data.password === password) {
          return {
            studentID: data.student_id,
            fullName: data.full_name,
            department: data.department,
            email: data.email,
            contact: data.contact,
          };
        } else {
          throw new Error('Invalid password.');
        }
      }
    }

    const students = getLocalStudents();
    const found = students.find(
      (s) => s.studentID.toUpperCase() === cleanId || s.email.toUpperCase() === cleanId
    );
    if (!found) {
      throw new Error('Student account not found. Please register first.');
    }
    return found;
  },

  loginAdmin: async (username: string, password: string): Promise<AdminUser> => {
    const u = username.trim();
    if (
      (u === 'admin' && password === 'admin123') ||
      (u === 'adminsrmap' && password === '123srmadmin')
    ) {
      return { username: u, fullName: 'Transport Administrator' };
    }
    throw new Error('Invalid administrator credentials.');
  },

  submitApplication: async (payload: {
    studentID: string;
    name: string;
    department: string;
    contact: string;
    email: string;
    route: string;
    boardingPoint: string;
    passType: string;
    validity: string;
  }): Promise<{ application: BusPassRecord; message: string }> => {
    const sId = payload.studentID.trim().toUpperCase();

    // Fetch all applications across database/local so IDs and slot counts are globally accurate
    const allApps = await cgiApi.getApplications();

    // Enforce 1 pass at a time rule (block if Pending or Approved exists)
    const hasActivePass = allApps.some(
      (a) =>
        a.studentID.toUpperCase() === sId &&
        (a.status === 'Pending' || a.status === 'Approved')
    );
    if (hasActivePass) {
      throw new Error(
        'You already have a Pending or Active Approved pass. Only one bus pass application is allowed at a time.'
      );
    }

    // Check if route is full (>= 20 approved slots)
    const routes = await cgiApi.getRoutes();
    const targetRoute = routes.find(
      (r) => r.routeNumber.toUpperCase() === payload.route.trim().toUpperCase()
    );
    if (targetRoute && targetRoute.status === 'Full') {
      throw new Error(
        `Route ${payload.route} has reached its maximum capacity of ${MAX_ROUTE_SLOTS} slots and is Full.`
      );
    }

    const client = getSupabaseClient();
    const newId = allApps.length > 0 ? Math.max(...allApps.map((a) => a.applicationID)) + 1 : 1001;

    const newApp: BusPassRecord = {
      applicationID: newId,
      studentID: sId,
      name: payload.name.trim(),
      department: payload.department.trim(),
      contact: payload.contact.trim(),
      email: payload.email.trim(),
      route: payload.route.trim(),
      boardingPoint: payload.boardingPoint.trim(),
      passType: payload.passType.trim(),
      validity: payload.validity.trim(),
      status: 'Pending',
    };

    if (client) {
      const { error } = await client.from('bus_passes').insert({
        application_id: newId,
        student_id: newApp.studentID,
        name: newApp.name,
        department: newApp.department,
        contact: newApp.contact,
        email: newApp.email,
        route: newApp.route,
        boarding_point: newApp.boardingPoint,
        pass_type: newApp.passType,
        validity: newApp.validity,
        status: newApp.status,
      });
      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }
    }

    const localApps = getLocalApps();
    localApps.push(newApp);
    saveLocalApps(localApps);

    return {
      application: newApp,
      message: 'Application submitted successfully.',
    };
  },

  getApplications: async (filters?: {
    studentID?: string;
    status?: string;
  }): Promise<BusPassRecord[]> => {
    const client = getSupabaseClient();
    let apps = getLocalApps();

    if (client) {
      const { data, error } = await client
        .from('bus_passes')
        .select('*')
        .order('application_id', { ascending: true });
      if (!error && data) {
        apps = data.map((d: any) => ({
          applicationID: d.application_id,
          studentID: d.student_id || '',
          name: d.name || '',
          department: d.department || '',
          contact: d.contact || '',
          email: d.email || '',
          route: d.route || '',
          boardingPoint: d.boarding_point || '',
          passType: d.pass_type || '',
          validity: d.validity || '',
          status: d.status || 'Pending',
          ticketPhoto: d.ticket_photo || undefined,
        }));
        saveLocalApps(apps);
      }
    }

    let filtered = apps;
    if (filters?.studentID) {
      const sId = filters.studentID.trim().toUpperCase();
      filtered = filtered.filter((a) => a.studentID.toUpperCase() === sId);
    }
    if (filters?.status && filters.status !== 'All') {
      filtered = filtered.filter((a) => a.status === filters.status);
    }
    return filtered;
  },

  saveTicketPhoto: async (
    pass: BusPassRecord,
    providedPhoto?: string
  ): Promise<string> => {
    const ticketPhoto = providedPhoto || (await generateDigitalTicketImage(pass));
    if (!ticketPhoto) return '';

    // 1. Persist locally
    const localApps = getLocalApps();
    const updatedLocal = localApps.map((a) =>
      a.applicationID === pass.applicationID ? { ...a, ticketPhoto } : a
    );
    saveLocalApps(updatedLocal);

    // 2. Persist in backend server ticket store (/api/tickets/:appId)
    try {
      await fetch(`/api/tickets/${pass.applicationID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentID: pass.studentID,
          ticketPhoto,
        }),
      });
    } catch {
      // Best effort
    }

    // 3. Attempt to persist in Supabase bus_passes.ticket_photo if column exists
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('bus_passes')
          .update({ ticket_photo: ticketPhoto })
          .eq('application_id', pass.applicationID);
      } catch {
        // Ignore gracefully if ticket_photo column is not yet created in Supabase
      }
    }

    return ticketPhoto;
  },

  verifyTicket: async (
    applicationID: number,
    studentID: string
  ): Promise<BusPassRecord | null> => {
    const client = getSupabaseClient();
    const sId = studentID.trim().toUpperCase();
    let record: BusPassRecord | null = null;

    if (client) {
      let query = client.from('bus_passes').select('*');
      if (applicationID > 0) {
        query = query.eq('application_id', applicationID);
      } else if (sId) {
        query = query.ilike('student_id', sId);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        record = {
          applicationID: data.application_id,
          studentID: data.student_id || '',
          name: data.name || '',
          department: data.department || '',
          contact: data.contact || '',
          email: data.email || '',
          route: data.route || '',
          boardingPoint: data.boarding_point || '',
          passType: data.pass_type || '',
          validity: data.validity || '',
          status: data.status || 'Pending',
          ticketPhoto: data.ticket_photo || undefined,
        };
      }
    }

    if (!record) {
      const localApps = getLocalApps();
      record =
        localApps.find(
          (a) =>
            (applicationID > 0 && a.applicationID === applicationID) ||
            (sId && a.studentID.toUpperCase() === sId)
        ) || null;
    }

    if (record && !record.ticketPhoto) {
      try {
        const res = await fetch(`/api/tickets/${record.applicationID}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.ticketPhoto) {
            record.ticketPhoto = json.ticketPhoto;
          }
        }
      } catch {
        // Offline fallback handled by DigitalTicketPage
      }
    }

    return record;
  },

  searchApplications: async (query: string): Promise<BusPassRecord[]> => {
    const q = query.trim().toUpperCase();
    const apps = await cgiApi.getApplications();
    return apps.filter(
      (a) =>
        a.studentID.toUpperCase().includes(q) ||
        a.name.toUpperCase().includes(q) ||
        String(a.applicationID).includes(q) ||
        a.route.toUpperCase().includes(q)
    );
  },

  updateApplication: async (payload: {
    applicationID: number;
    route: string;
    boardingPoint: string;
    passType: string;
    validity: string;
    status: string;
  }): Promise<string> => {
    const client = getSupabaseClient();
    const allApps = await cgiApi.getApplications();
    const existing = allApps.find((a) => a.applicationID === payload.applicationID);

    const nextRoute = payload.route.trim() || existing?.route || '';
    const nextBoarding = payload.boardingPoint.trim() || existing?.boardingPoint || '';
    const nextPassType = payload.passType.trim() || existing?.passType || '';
    const nextValidity = payload.validity.trim() || existing?.validity || '';
    const nextStatus = payload.status.trim() || existing?.status || 'Pending';

    // Enforce 20-slot maximum when moving into Approved status on nextRoute
    if (
      nextStatus === 'Approved' &&
      nextRoute &&
      (existing?.status !== 'Approved' ||
        existing.route.toUpperCase() !== nextRoute.toUpperCase())
    ) {
      const approvedOnRoute = allApps.filter(
        (a) =>
          a.applicationID !== payload.applicationID &&
          a.route.toUpperCase() === nextRoute.toUpperCase() &&
          a.status === 'Approved'
      ).length;
      if (approvedOnRoute >= MAX_ROUTE_SLOTS) {
        throw new Error(
          `Route ${nextRoute} has reached its maximum capacity of ${MAX_ROUTE_SLOTS} slots and is Full.`
        );
      }
    }

    const updatedApps = allApps.map((a) =>
      a.applicationID === payload.applicationID
        ? {
            ...a,
            route: nextRoute,
            boardingPoint: nextBoarding,
            passType: nextPassType,
            validity: nextValidity,
            status: nextStatus,
          }
        : a
    );
    saveLocalApps(updatedApps);

    if (client) {
      const { error } = await client
        .from('bus_passes')
        .update({
          route: nextRoute,
          boarding_point: nextBoarding,
          pass_type: nextPassType,
          validity: nextValidity,
          status: nextStatus,
        })
        .eq('application_id', payload.applicationID);
      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }
    }

    if (nextRoute) {
      await syncRouteFullStatus(nextRoute, updatedApps);
    }
    if (existing?.route && existing.route.toUpperCase() !== nextRoute.toUpperCase()) {
      await syncRouteFullStatus(existing.route, updatedApps);
    }

    // Generate & save digital ticket photo whenever status becomes Approved
    if (nextStatus === 'Approved') {
      const approvedRecord = updatedApps.find(
        (a) => a.applicationID === payload.applicationID
      );
      if (approvedRecord) {
        await cgiApi.saveTicketPhoto(approvedRecord);
      }
    }

    return `Application #${payload.applicationID} updated successfully.`;
  },

  approveApplication: async (applicationID: number): Promise<string> => {
    const apps = await cgiApi.getApplications();
    const target = apps.find((a) => a.applicationID === applicationID);
    if (!target) {
      throw new Error('Application not found.');
    }

    const routes = await cgiApi.getRoutes();
    const resolvedRoute =
      target.route?.trim() ||
      routes.find((r) => r.status !== 'Full')?.routeNumber ||
      routes[0]?.routeNumber ||
      'R-101';
    const routeObj = routes.find(
      (r) => r.routeNumber.toUpperCase() === resolvedRoute.toUpperCase()
    );
    const resolvedBoarding =
      target.boardingPoint?.trim() ||
      routeObj?.boardingPoints.split(',')[0]?.trim() ||
      'University Main Gate';
    const resolvedPassType = target.passType?.trim() || 'Semester';
    let resolvedValidity = target.validity?.trim();
    if (!resolvedValidity) {
      const d = new Date();
      d.setMonth(d.getMonth() + (resolvedPassType === 'Yearly' ? 8 : 4));
      resolvedValidity = d.toISOString().slice(0, 10);
    }

    const approvedOnRoute = apps.filter(
      (a) =>
        a.applicationID !== applicationID &&
        a.route.toUpperCase() === resolvedRoute.toUpperCase() &&
        a.status === 'Approved'
    ).length;

    if (resolvedRoute && approvedOnRoute >= MAX_ROUTE_SLOTS) {
      throw new Error(
        `Route ${resolvedRoute} has reached its maximum capacity of ${MAX_ROUTE_SLOTS} slots and is Full.`
      );
    }

    await cgiApi.updateApplication({
      applicationID,
      route: resolvedRoute,
      boardingPoint: resolvedBoarding,
      passType: resolvedPassType,
      validity: resolvedValidity,
      status: 'Approved',
    });

    return `Application #${applicationID} marked as Approved.`;
  },

  rejectApplication: async (applicationID: number): Promise<string> => {
    const apps = await cgiApi.getApplications();
    const target = apps.find((a) => a.applicationID === applicationID);
    if (!target) {
      throw new Error('Application not found.');
    }

    await cgiApi.updateApplication({
      applicationID,
      route: target.route,
      boardingPoint: target.boardingPoint,
      passType: target.passType,
      validity: target.validity,
      status: 'Rejected',
    });
    return `Application #${applicationID} marked as Rejected.`;
  },

  renewPass: async (payload: {
    applicationID: number;
    studentID: string;
    passType: string;
    validity: string;
  }): Promise<{ application: BusPassRecord; message: string }> => {
    const allApps = await cgiApi.getApplications();
    const sId = payload.studentID.trim().toUpperCase();
    const hasPending = allApps.some(
      (a) => a.studentID.toUpperCase() === sId && a.status === 'Pending'
    );
    if (hasPending) {
      throw new Error(
        'You already have a Pending application awaiting review. Only one application is allowed at a time.'
      );
    }

    const original = allApps.find((a) => a.applicationID === payload.applicationID);
    if (!original) {
      throw new Error('Original pass record not found.');
    }

    const today = new Date().toISOString().slice(0, 10);
    if (original.status === 'Approved' && original.validity && original.validity >= today) {
      throw new Error(
        `Your current bus pass (#${original.applicationID}) is still active until ${original.validity}. Only one active pass is allowed at a time.`
      );
    }

    // Check route capacity before submitting renewal
    const routes = await cgiApi.getRoutes();
    const targetRoute = routes.find(
      (r) => r.routeNumber.toUpperCase() === original.route.toUpperCase()
    );
    if (targetRoute && targetRoute.status === 'Full') {
      throw new Error(
        `Route ${original.route} has reached its maximum capacity of ${MAX_ROUTE_SLOTS} slots and is Full.`
      );
    }

    // Mark expired approved pass as Renewed/Expired or update it as a fresh Pending renewal
    await cgiApi.updateApplication({
      applicationID: original.applicationID,
      route: original.route,
      boardingPoint: original.boardingPoint,
      passType: payload.passType,
      validity: payload.validity,
      status: 'Pending',
    });

    const updatedRecord: BusPassRecord = {
      ...original,
      passType: payload.passType,
      validity: payload.validity,
      status: 'Pending',
    };

    return {
      application: updatedRecord,
      message: `Renewal request for Pass #${original.applicationID} submitted for review.`,
    };
  },

  generatePass: async (studentID: string): Promise<{
    found: boolean;
    isActivePass: boolean;
    pass: BusPassRecord | null;
  }> => {
    const sId = studentID.trim().toUpperCase();
    const apps = await cgiApi.getApplications({ studentID: sId });
    const approved = apps.filter((a) => a.status === 'Approved');
    const pass = approved.length > 0 ? approved[approved.length - 1] : apps[apps.length - 1] || null;
    return {
      found: pass !== null,
      isActivePass: pass?.status === 'Approved',
      pass,
    };
  },

  addRoute: async (payload: BusRouteRecord): Promise<string> => {
    const client = getSupabaseClient();
    const routes = getLocalRoutes();
    if (routes.some((r) => r.routeNumber.toUpperCase() === payload.routeNumber.toUpperCase())) {
      throw new Error('Route already exists.');
    }
    routes.push(payload);
    saveLocalRoutes(routes);

    if (client) {
      await client.from('routes').insert({
        route_number: payload.routeNumber,
        start_location: payload.startLocation,
        end_location: payload.endLocation,
        boarding_points: payload.boardingPoints,
        status: payload.status,
      });
    }

    return `Route ${payload.routeNumber} added successfully.`;
  },

  updateRoute: async (payload: BusRouteRecord): Promise<string> => {
    const client = getSupabaseClient();
    const routes = getLocalRoutes();
    const idx = routes.findIndex((r) => r.routeNumber.toUpperCase() === payload.routeNumber.toUpperCase());
    if (idx !== -1) {
      routes[idx] = payload;
      saveLocalRoutes(routes);
    }

    if (client) {
      await client
        .from('routes')
        .update({
          start_location: payload.startLocation,
          end_location: payload.endLocation,
          boarding_points: payload.boardingPoints,
          status: payload.status,
        })
        .eq('route_number', payload.routeNumber);
    }

    return `Route ${payload.routeNumber} updated successfully.`;
  },

  deleteRoute: async (routeNumber: string): Promise<string> => {
    const client = getSupabaseClient();
    let routes = getLocalRoutes();
    routes = routes.filter((r) => r.routeNumber.toUpperCase() !== routeNumber.toUpperCase());
    saveLocalRoutes(routes);

    if (client) {
      await client.from('routes').delete().eq('route_number', routeNumber);
    }

    return `Route ${routeNumber} removed successfully.`;
  },

  listStudents: async (studentID?: string): Promise<StudentUser[]> => {
    const client = getSupabaseClient();
    let students = getLocalStudents();

    if (client) {
      const { data, error } = await client.from('students').select('*');
      if (!error && data) {
        students = data.map((d: any) => ({
          studentID: d.student_id,
          fullName: d.full_name,
          department: d.department,
          email: d.email,
          contact: d.contact,
        }));
        saveLocalStudents(students);
      }
    }

    if (studentID) {
      const sId = studentID.trim().toUpperCase();
      return students.filter((s) => s.studentID.toUpperCase().includes(sId));
    }
    return students;
  },

  getAdminReport: async (): Promise<AdminReportData> => {
    const students = await cgiApi.listStudents();
    const apps = await cgiApi.getApplications();
    const routes = await cgiApi.getRoutes();

    const pending = apps.filter((a) => a.status === 'Pending').length;
    const approved = apps.filter((a) => a.status === 'Approved').length;
    const rejected = apps.filter((a) => a.status === 'Rejected').length;

    const routeCounts = routes.map((r) => ({
      route: r.routeNumber,
      count: apps.filter(
        (a) => a.route.toUpperCase() === r.routeNumber.toUpperCase() && a.status === 'Approved'
      ).length,
    }));

    return {
      totalStudents: students.length,
      totalApplications: apps.length,
      pendingApplications: pending,
      approvedApplications: approved,
      rejectedApplications: rejected,
      routeCounts,
    };
  },
};
