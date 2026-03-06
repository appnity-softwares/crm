import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';

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
import NotFound from './pages/NotFound';

function ProtectedLayout() {
    const { user, loading } = useAuth();
    if (loading) return <div className="spinner" style={{ height: '100vh' }} />;
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-area">
                <TopHeader />
                <Outlet />
            </main>
        </div>
    );
}

function ElevatedRoute({ children }) {
    const { hasElevated } = useAuth();
    if (!hasElevated) return <Navigate to="/" replace />;
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
                                <Route element={<ProtectedLayout />}>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/employees" element={<ElevatedRoute><Employees /></ElevatedRoute>} />
                                    <Route path="/employees/:id" element={<ElevatedRoute><EmployeeDetail /></ElevatedRoute>} />
                                    <Route path="/attendance" element={<Attendance />} />
                                    <Route path="/projects" element={<Projects />} />
                                    <Route path="/worklogs" element={<WorkLogs />} />
                                    <Route path="/reports" element={<DailyReports />} />
                                    <Route path="/payroll" element={<Payroll />} />
                                    <Route path="/invoices" element={<ElevatedRoute><Invoices /></ElevatedRoute>} />
                                    <Route path="/leads" element={<ElevatedRoute><Leads /></ElevatedRoute>} />
                                    <Route path="/role-access" element={<ElevatedRoute><RoleAccess /></ElevatedRoute>} />
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
