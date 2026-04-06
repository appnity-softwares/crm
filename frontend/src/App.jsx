import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import FloatingNav from './components/layout/FloatingNav';
import MobileNav from './components/layout/MobileNav';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Projects from './pages/Projects';
import WorkLogs from './pages/WorkLogs';
import Payroll from './pages/Payroll';
import Invoices from './pages/Invoices';
import Leads from './pages/Leads';
import Profile from './pages/Profile';
import DailyReports from './pages/DailyReports';
import EmployeeDetail from './pages/EmployeeDetail';
import RoleAccess from './pages/RoleAccess';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Leaves from './pages/Leaves';
import Chat from './pages/Chat';
import ProjectDetail from './pages/ProjectDetail';
import Tickets from './pages/Tickets';
import NotFound from './pages/NotFound';
import ClientPortal from './pages/ClientPortal';
import Register from './pages/Register';
import ProspectDashboard from './pages/ProspectDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ClientLogin from './pages/ClientLogin';
import LeadLogin from './pages/LeadLogin';
import LeadRegister from './pages/LeadRegister';
import Clients from './pages/Clients';
import Income from './pages/Income';
import ChatPermissions from './pages/ChatPermissions';
import FinanceAnalytics from './pages/FinanceAnalytics';
import TraineeDashboard from './pages/TraineeDashboard';
import StudentAttendance from './pages/StudentAttendance';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Students from './pages/Students';

function ProtectedLayout() {
    const { user, loading } = useAuth();

    if (loading) return <div className="spinner" style={{ height: '100vh' }} />;
    if (!user) return <Navigate to="/login" replace />;

    const navStyle = user.nav_style || 'both';
    const showSidebar = (navStyle === 'sidebar' || navStyle === 'both');
    const showFloating = (navStyle === 'floating' || navStyle === 'both');

    return (
        <div className="app-layout">
            {showSidebar && <Sidebar />}
            {showFloating && <FloatingNav />}
            <main 
                className="main-area" 
                style={(!showSidebar) ? { marginLeft: 0 } : {}}
            >
                <TopHeader />
                <div className="page-enter">
                    <Outlet />
                </div>
            </main>
            <MobileNav />
        </div>
    );
}

function ElevatedRoute({ children, module }) {
    const { canAccess, user } = useAuth();
    if (module && !canAccess(module)) return <Navigate to="/" replace />;
    if (!module && user?.role === 'employee') return <Navigate to="/" replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <ToastProvider>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/client-login" element={<ClientLogin />} />
                                <Route path="/lead-login" element={<LeadLogin />} />
                                <Route path="/lead-register" element={<LeadRegister />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/portal/:token" element={<ClientPortal />} />
                                <Route element={<ProtectedLayout />}>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/prospect-dashboard" element={<ProspectDashboard />} />
                                    <Route path="/client-dashboard" element={<ClientDashboard />} />
                                    <Route path="/trainee-dashboard" element={<TraineeDashboard />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/employees" element={<ElevatedRoute module="employees"><Employees /></ElevatedRoute>} />
                                    <Route path="/employees/:id" element={<ElevatedRoute module="employees"><EmployeeDetail /></ElevatedRoute>} />
                                    <Route path="/clients" element={<ElevatedRoute module="employees"><Clients /></ElevatedRoute>} />
                                    <Route path="/chat/permissions" element={<ElevatedRoute module="employees"><ChatPermissions /></ElevatedRoute>} />
                                    <Route path="/attendance" element={<Attendance />} />
                                    <Route path="/projects" element={<Projects />} />
                                    <Route path="/projects/:id" element={<ProjectDetail />} />
                                    <Route path="/worklogs" element={<WorkLogs />} />
                                    <Route path="/reports" element={<DailyReports />} />
                                    <Route path="/payroll" element={<Payroll />} />
                                    <Route path="/income" element={<ElevatedRoute module="income"><Income /></ElevatedRoute>} />
                                    <Route path="/finance-analytics" element={<ElevatedRoute module="finance"><FinanceAnalytics /></ElevatedRoute>} />
                                    <Route path="/expenses" element={<ElevatedRoute module="expenses"><Expenses /></ElevatedRoute>} />
                                    <Route path="/invoices" element={<ElevatedRoute module="invoices"><Invoices /></ElevatedRoute>} />
                                    <Route path="/leads" element={<ElevatedRoute module="leads"><Leads /></ElevatedRoute>} />
                                    <Route path="/tickets" element={<ElevatedRoute module="tickets"><Tickets /></ElevatedRoute>} />
                                    <Route path="/leaves" element={<Leaves />} />
                                    <Route path="/chat" element={<Chat />} />
                                    <Route path="/role-access" element={<ElevatedRoute module="role-access"><RoleAccess /></ElevatedRoute>} />
                                    <Route path="/settings" element={<ElevatedRoute module="role-access"><Settings /></ElevatedRoute>} />
                                    
                                    <Route path="/training/courses" element={<ElevatedRoute module="employees"><Courses /></ElevatedRoute>} />
                                    <Route path="/training/courses/:id" element={<ElevatedRoute module="employees"><CourseDetail /></ElevatedRoute>} />
                                    <Route path="/training/students" element={<ElevatedRoute module="employees"><Students /></ElevatedRoute>} />
                                    <Route path="/training/attendance" element={<StudentAttendance />} />
                                    <Route path="*" element={<NotFound />} />
                                </Route>
                            </Routes>
                        </ToastProvider>
                    </NotificationProvider>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
