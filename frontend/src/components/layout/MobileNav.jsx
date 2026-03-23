import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, FolderKanban, GraduationCap, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileNav() {
    const { user } = useAuth();
    
    // Custom items per role if needed
    const isAlumni = user?.role === 'alumni';
    const isTrainee = user?.role === 'trainee';
    const isExternal = user?.role === 'prospect' || user?.role === 'client' || isTrainee || isAlumni;

    return (
        <div className="mobile-bottom-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                <LayoutDashboard size={20} />
                <span>Home</span>
            </NavLink>
            
            <NavLink to="/chat" className={({ isActive }) => isActive ? 'active' : ''}>
                <MessageSquare size={20} />
                <span>Chat</span>
            </NavLink>

            {isExternal ? (
                <>
                    {(isTrainee || isAlumni) && (
                        <NavLink to="/trainee-dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                            <GraduationCap size={20} />
                            <span>Training</span>
                        </NavLink>
                    )}
                    {isAlumni && (
                        <NavLink to="/jobs" className={({ isActive }) => isActive ? 'active' : ''}>
                            <FolderKanban size={20} />
                            <span>Jobs</span>
                        </NavLink>
                    )}
                </>
            ) : (
                <>
                    <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
                        <FolderKanban size={20} />
                        <span>Projects</span>
                    </NavLink>
                    <NavLink to="/training/students" className={({ isActive }) => isActive ? 'active' : ''}>
                        <GraduationCap size={20} />
                        <span>Students</span>
                    </NavLink>
                </>
            )}

            <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                <User size={20} />
                <span>Profile</span>
            </NavLink>
        </div>
    );
}
