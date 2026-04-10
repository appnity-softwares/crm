import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, employeeAPI, chatPermissionAPI, incomeAPI, configAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { 
    ChevronLeft, Plus, MoreVertical, Calendar, User, Trash2, 
    GripVertical, LayoutGrid, Clock, IndianRupee, Target, CheckCircle2, 
    AlertCircle, ExternalLink, Link as LinkIcon, FileText, Activity
} from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { user: me, hasElevated, isClient, isAdmin } = useAuth();
    
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [chatPermissions, setChatPermissions] = useState([]);
    const [projectIncome, setProjectIncome] = useState([]);
    const [projectUpdates, setProjectUpdates] = useState([]);
    const [projectLogs, setProjectLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks');
    
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateForm, setUpdateForm] = useState({ title: '', description: '', link: '', project_id: id });

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', project_id: id });
    const [saving, setSaving] = useState(false);
    
    const [assignForm, setAssignForm] = useState({ user_id: '', role: 'member' });
    const [showAssignModal, setShowAssignModal] = useState(false);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', total_value: 0, amount_paid: 0, status: '', sow: '', progress: 0 });

    const load = async () => {
        try {
            const [pRes, tRes, eRes, cpRes, iRes, uRes, lRes] = await Promise.all([
                projectAPI.getOne(id),
                taskAPI.getByProject(id),
                hasElevated ? employeeAPI.getAll() : Promise.resolve({ data: { employees: [] } }),
                isClient ? chatPermissionAPI.getAll() : Promise.resolve({ data: [] }),
                isAdmin ? incomeAPI.getAll({ project_id: id }) : Promise.resolve({ data: [] }),
                projectAPI.getUpdates(id),
                isAdmin ? configAPI.getAuditLogs({ module: 'project', target_id: id }) : Promise.resolve({ data: [] })
            ]);
            setProject(pRes.data.project || pRes.data);
            setTasks(tRes.data.tasks || []);
            setEmployees(eRes.data.employees || []);
            setChatPermissions(cpRes.data || []);
            setProjectIncome(Array.isArray(iRes.data?.income) ? iRes.data.income : []);
            setProjectUpdates(uRes.data || []);
            setProjectLogs(lRes.data || []);
        } catch (err) { console.error(err); navigate('/projects'); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [id]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...taskForm, project_id: id };
            if (!data.assignee_id) delete data.assignee_id;
            await taskAPI.create(data);
            toast('Task created');
            setShowTaskModal(false);
            setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', project_id: id });
            load();
        } catch { toast('Failed to create task', 'error'); } finally { setSaving(false); }
    };

    const updateTaskStatus = async (task, newStatus) => {
        try {
            await taskAPI.update(task.id, { ...task, status: newStatus });
            load();
        } catch { toast('Update failed', 'error'); }
    };

    const handleDeleteTask = async (tid) => {
        if (!window.confirm("Delete this task?")) return;
        try {
            await taskAPI.remove(tid);
            load();
        } catch { toast('Delete failed', 'error'); }
    };

    const handleAssignMember = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await projectAPI.assignMember(id, assignForm);
            toast('Member assigned successfully');
            setShowAssignModal(false);
            setAssignForm({ user_id: '', role: 'member' });
            load();
        } catch (err) { toast(err.response?.data?.error || 'Assignment failed', 'error'); } finally { setSaving(false); }
    };

    const handleRemoveMember = async (uid) => {
        if (!window.confirm("Remove this member from project?")) return;
        try {
            await projectAPI.removeMember(id, uid);
            toast('Member removed');
            load();
        } catch { toast('Failed to remove member', 'error'); }
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...editForm };
            if (!payload.client_id) payload.client_id = null;
            await projectAPI.update(id, payload);
            toast('Project details updated!');
            setShowEditModal(false);
            load();
        } catch { toast('Update failed', 'error'); } finally { setSaving(false); }
    };

    const handleCreateUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await projectAPI.postUpdate(updateForm);
            toast('Project update posted');
            setShowUpdateModal(false);
            setUpdateForm({ title: '', description: '', link: '', project_id: id });
            load();
        } catch { toast('Failed to post update', 'error'); } 
        finally { setSaving(false); }
    };

    const handleSignSOW = async () => {
        if (!window.confirm("Do you formally accept the terms in this SOW?")) return;
        try {
            await projectAPI.signSOW(id);
            toast('SOW Signed Successfully!', 'success');
            load();
        } catch { toast('Failed to sign SOW', 'error'); }
    };

    if (loading) return <div className="spinner" />;

    const columns = [
        { id: 'todo', title: 'To Do', color: 'gray' },
        { id: 'doing', title: 'In Progress', color: 'blue' },
        { id: 'done', title: 'Completed', color: 'green' }
    ];

    return (
        <div className="page-content">
            <div className="project-hero card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-card)', padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <button onClick={() => navigate('/projects')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}><ChevronLeft size={20} /></button>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{project?.name}</h1>
                                <span className={`badge ${project?.status === 'active' ? 'green' : 'gray'}`} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{project?.status}</span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', maxWidth: 800 }}>{project?.description}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {(isAdmin || me?.role === 'manager') && (
                                <button className="btn btn-secondary" onClick={() => {
                                    setEditForm({ ...project, start_date: project.start_date?.split('T')[0], end_date: project.end_date?.split('T')[0] });
                                    setShowEditModal(true);
                                }}>Edit Project</button>
                            )}
                            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={16} /> New Task</button>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isAdmin ? 5 : 4}, 1fr)`, padding: '20px 32px', background: 'var(--bg-app)' }}>
                    <div style={{ borderRight: '1px solid var(--border)' }}>
                        <label style={heroLabelStyle}>Progress</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${project?.progress || 0}%`, height: '100%', background: 'var(--primary-500)' }} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{project?.progress}%</span>
                        </div>
                    </div>
                    <div style={{ borderRight: '1px solid var(--border)', paddingLeft: 32 }}>
                        <label style={heroLabelStyle}>Start Date</label>
                        <div style={{ fontWeight: 600, marginTop: 4 }}>{new Date(project?.start_date).toLocaleDateString()}</div>
                    </div>
                    {isAdmin && (
                        <div style={{ borderRight: '1px solid var(--border)', paddingLeft: 32 }}>
                            <label style={heroLabelStyle}>Project Value</label>
                            <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--primary-600)' }}>₹{project?.total_value?.toLocaleString() || '0'}</div>
                        </div>
                    )}
                    <div style={{ borderRight: '1px solid var(--border)', paddingLeft: 32 }}>
                         <label style={heroLabelStyle}>Client</label>
                         <div style={{ fontWeight: 600, marginTop: 4 }}>{project?.client?.name || 'Self-Managed'}</div>
                    </div>
                    <div style={{ paddingLeft: 32 }}>
                        <label style={heroLabelStyle}>Active Team</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: -8, marginTop: 4 }}>
                            {project?.assignments?.filter(a => !a.removed_at).slice(0, 5).map((a, i) => (
                                <div key={i} title={a.user?.name} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, marginLeft: i === 0 ? 0 : -10 }}>
                                    {a.user?.name?.charAt(0) || '?'}
                                </div>
                            ))}
                            {project?.assignments?.filter(a => !a.removed_at).length > 5 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>+{project.assignments.filter(a => !a.removed_at).length - 5}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="tabs" style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)' }}>
                        <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')} style={tabStyle(activeTab === 'tasks')}>
                            <LayoutGrid size={16} /> Tasks
                        </button>
                        <button className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')} style={tabStyle(activeTab === 'updates')}>
                            <Target size={16} /> Timeline
                        </button>
                        <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')} style={tabStyle(activeTab === 'resources')}>
                            <LinkIcon size={16} /> Resources
                        </button>
                        {isAdmin && (
                            <button className={`tab-btn ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')} style={tabStyle(activeTab === 'financials')}>
                                <IndianRupee size={16} /> Financials
                            </button>
                        )}
                        {isAdmin && (
                            <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>
                                <Activity size={16} /> Activity
                            </button>
                        )}
                    </div>

                    <div className="tab-content">
                        {activeTab === 'tasks' && (
                            <div className="kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                                {columns.map(col => (
                                    <div key={col.id} className="kanban-column" style={{ background: 'var(--bg-body)', borderRadius: 12, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
                                        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{col.title}</h4>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{tasks.filter(t => t.status === col.id).length}</span>
                                        </div>
                                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {tasks.filter(t => t.status === col.id).map(task => (
                                                <div key={task.id} className="card" style={{ padding: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span className={`badge ${task.priority === 'high' ? 'red' : 'gray'}`} style={{ fontSize: '0.6rem' }}>{task.priority}</span>
                                                        {(isAdmin || hasElevated) && <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={12} /></button>}
                                                    </div>
                                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>{task.title}</h5>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>{task.assignee?.name[0] || '?'}</div>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.assignee?.name.split(' ')[0] || 'Unassigned'}</span>
                                                        </div>
                                                        <select value={task.status} onChange={(e) => updateTaskStatus(task, e.target.value)} style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                                            {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'updates' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3>Project Timeline</h3>
                                    {(hasElevated || project?.assignments?.some(a => a.user_id === me.id && a.role === 'lead')) && (
                                        <button className="btn btn-primary btn-sm" onClick={() => setShowUpdateModal(true)}><Plus size={14} /> Post Update</button>
                                    )}
                                </div>
                                {projectUpdates.map((upd, i) => (
                                    <div key={i} className="card" style={{ padding: 24 }}>
                                        <div style={{ display: 'flex', gap: 16 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Target size={18} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{upd.title}</h4>
                                                        <p style={{ margin: '4px 0 12px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(upd.created_at).toLocaleString()} &bull; by {upd.author?.name}</p>
                                                    </div>
                                                    {upd.link && <a href={upd.link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary"><ExternalLink size={12} /> View</a>}
                                                </div>
                                                <p style={{ lineHeight: 1.6, margin: 0 }}>{upd.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                                <div style={{ maxWidth: 400, margin: '0 auto' }}>
                                    <LinkIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                                    <h3>Project Assets & Links</h3>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Centralize all project-related resources like GitHub repositories, design files (Figma), and staging links.</p>
                                    <button className="btn btn-primary" disabled><Plus size={16} /> Add Resource Link</button>
                                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Feature coming in the next update</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="card" style={{ padding: 0 }}>
                                <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}><h3>Payment History</h3></div>
                                <DataTable 
                                    columns={[
                                        { header: 'Date', accessor: 'date', render: r => new Date(r.date).toLocaleDateString() },
                                        { header: 'Source', accessor: 'source' },
                                        { header: 'Category', accessor: 'category' },
                                        { header: 'Amount', accessor: 'amount', render: r => <span style={{ fontWeight: 600, color: 'var(--green-600)' }}>+ ₹{r.amount.toLocaleString()}</span> }
                                    ]}
                                    data={projectIncome}
                                />
                            </div>
                        )}

                        {activeTab === 'logs' && (
                            <div className="card" style={{ padding: 0 }}>
                                <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}><h3>Project Audit Logs</h3></div>
                                <DataTable
                                    columns={[
                                        { header: 'Time', accessor: 'created_at', render: r => new Date(r.created_at).toLocaleString() },
                                        { header: 'User', accessor: r => r.user?.name || 'System' },
                                        { header: 'Action', accessor: 'action', render: r => <span className="badge blue">{r.action}</span> },
                                        { header: 'Details', accessor: 'changes' }
                                    ]}
                                    data={projectLogs}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {hasElevated && (
                        <div className="card" style={{ padding: 24, background: 'var(--primary-50)', border: '1px solid var(--primary-200)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <ExternalLink size={16} className="text-primary" />
                                <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Client Portal</h3>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>Share this secure link with the client to let them track progress and pay invoices.</p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-primary btn-sm flex-1" onClick={() => {
                                    const token = project.client_portal_token || project.id;
                                    const link = `${window.location.origin}/portal/${token}`;
                                    navigator.clipboard.writeText(link);
                                    toast('Portal link copied to clipboard!', 'success');
                                }}>
                                    Copy Secure Link
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                    const token = project.client_portal_token || project.id;
                                    window.open(`/portal/${token}`, '_blank');
                                }}>
                                    Preview
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: '0.95rem' }}>Team Members</h3>
                            {hasElevated && <button className="btn btn-sm btn-secondary" onClick={() => setShowAssignModal(true)}><Plus size={12} /></button>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {project?.assignments?.map(assign => (
                                <div key={assign.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>{assign.user?.name?.charAt(0) || '?'}</div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{assign.user?.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{assign.role}</div>
                                        </div>
                                    </div>
                                    {hasElevated && <button className="btn btn-sm" onClick={() => handleRemoveMember(assign.user_id)} style={{ color: 'var(--red-400)', padding: 4 }}><Trash2 size={12} /></button>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Project SOW</h3>
                        <div style={{ background: 'var(--bg-body)', padding: 12, borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, maxHeight: 150, overflow: 'hidden', marginBottom: 12 }}>
                            {project?.sow || 'No Statement of Work provided yet.'}
                        </div>
                        {project?.sow_signed_at ? (
                            <div className="badge green w-full" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <CheckCircle2 size={12} /> Signed {new Date(project.sow_signed_at).toLocaleDateString()}
                            </div>
                        ) : isClient ? (
                            <button className="btn btn-primary w-full" onClick={handleSignSOW} disabled={!project?.sow}>Sign SOW Document</button>
                        ) : (
                            <div className="badge gray w-full" style={{ padding: 10 }}>Awaiting Signature</div>
                        )}
                        <button className="btn btn-sm btn-secondary w-full" style={{ marginTop: 12 }} onClick={() => setActiveTab('resources')}>Full Document View</button>
                    </div>

                    <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--amber-500)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <AlertCircle size={16} className="amber" />
                            <h3 style={{ fontSize: '0.9rem', margin: 0 }}>Upcoming Deadline</h3>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{project?.end_date ? new Date(project?.end_date).toLocaleDateString() : 'TBD'}</div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on current milestone schedule</p>
                    </div>
                </div>
            </div>

            {showTaskModal && (
                <Modal title="Create New Task" onClose={() => setShowTaskModal(false)}>
                    <form onSubmit={handleCreateTask}>
                        <div className="form-group"><label>Title</label><input required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
                        <div className="form-group" style={{ marginTop: 12 }}><label>Description</label><textarea rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                        <div className="form-grid" style={{ marginTop: 12 }}>
                            <div className="form-group"><label>Priority</label><select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                            <div className="form-group"><label>Assignee</label><select value={taskForm.assignee_id} onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}><option value="">Unassigned</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select></div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>Create Task</button>
                        </div>
                    </form>
                </Modal>
            )}
            
            {showAssignModal && (
                <Modal title="Assign Member" onClose={() => setShowAssignModal(false)}>
                    <form onSubmit={handleAssignMember}>
                        <div className="form-group"><label>User</label><select required value={assignForm.user_id} onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}><option value="">Select...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                        <div className="form-group" style={{ marginTop: 12 }}><label>Role</label><select value={assignForm.role} onChange={e => setAssignForm({ ...assignForm, role: e.target.value })}><option value="member">Member</option><option value="lead">Lead</option></select></div>
                        <div className="form-actions" style={{ marginTop: 24 }}><button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>Assign</button></div>
                    </form>
                </Modal>
            )}

            {showUpdateModal && (
                <Modal title="Post Project Update" onClose={() => setShowUpdateModal(false)}>
                    <form onSubmit={handleCreateUpdate}>
                        <div className="form-group"><label>Title</label><input required value={updateForm.title} onChange={e => setUpdateForm({ ...updateForm, title: e.target.value })} /></div>
                        <div className="form-group" style={{ marginTop: 12 }}><label>Details</label><textarea rows={4} required value={updateForm.description} onChange={e => setUpdateForm({ ...updateForm, description: e.target.value })} /></div>
                        <div className="form-group" style={{ marginTop: 12 }}><label>External Link</label><input value={updateForm.link} onChange={e => setUpdateForm({ ...updateForm, link: e.target.value })} /></div>
                        <div className="form-actions" style={{ marginTop: 24 }}><button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>Post</button></div>
                    </form>
                </Modal>
            )}

            {showEditModal && (
                <Modal title="Edit Project Details" onClose={() => setShowEditModal(false)} size="lg">
                    <form onSubmit={handleUpdateProject}>
                        <div className="form-group"><label>Project Name *</label><input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                        <div className="form-group" style={{ marginTop: 12 }}><label>Description</label><textarea rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
                        <div className="form-grid" style={{ marginTop: 12 }}>
                            <div className="form-group">
                                <label>Project Status</label>
                                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                    <option value="planning">Planning</option>
                                    <option value="active">Active</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="completed">Completed</option>
                                    <option value="under_maintenance">Under Maintenance</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Progress ({editForm.progress}%)</label>
                                <input type="range" min="0" max="100" value={editForm.progress} onChange={e => setEditForm({ ...editForm, progress: parseInt(e.target.value) })} style={{ width: '100%' }} />
                            </div>
                            {isAdmin && (
                                <>
                                    <div className="form-group"><label>Total Value (₹)</label><input type="number" value={editForm.total_value} onChange={e => setEditForm({ ...editForm, total_value: parseFloat(e.target.value) || 0 })} /></div>
                                    <div className="form-group"><label>Amount Paid (₹)</label><input type="number" value={editForm.amount_paid} onChange={e => setEditForm({ ...editForm, amount_paid: parseFloat(e.target.value) || 0 })} /></div>
                                </>
                            )}
                        </div>
                        <div className="form-group" style={{ marginTop: 12 }}><label>Statement of Work (SOW)</label><textarea rows={5} value={editForm.sow} onChange={e => setEditForm({ ...editForm, sow: e.target.value })} placeholder="Detailed scope of project..." /></div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>Update Project</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

const tabStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--primary-500)' : '2px solid transparent',
    color: active ? 'var(--primary-600)' : 'var(--text-muted)',
    padding: '0 0 12px 0',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: '0.2s'
});

const heroLabelStyle = {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700
};
