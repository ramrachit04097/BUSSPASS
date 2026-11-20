export interface StudentUser {
  studentID: string;
  fullName: string;
  department: string;
  email: string;
  contact: string;
}

export interface AdminUser {
  username: string;
  fullName: string;
}

export interface BusPassRecord {
  applicationID: number;
  studentID: string;
  name: string;
  department: string;
  contact: string;
  email: string;
  route: string;
  boardingPoint: string;
  passType: string;
  validity: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  ticketPhoto?: string;
}

export interface BusRouteRecord {
  routeNumber: string;
  startLocation: string;
  endLocation: string;
  boardingPoints: string;
  status: 'Available' | 'Limited' | 'Full' | string;
}

export interface RouteApplicationCount {
  route: string;
  count: number;
}

export interface AdminReportData {
  totalStudents: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  routeCounts: RouteApplicationCount[];
}
