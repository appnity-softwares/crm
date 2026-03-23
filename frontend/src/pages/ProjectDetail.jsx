import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, employeeAPI, chatPermissionAPI, incomeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { ChevronLeft, Plus, MoreVertical, Calendar, User, Trash2, GripVertical } from 'lucide-react';

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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks');
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateForm, setUpdateForm] = useState({ title: '', description: '', link: '', project_id: id });

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', project_id: id });
    const [saving, setSaving] = useState(false);
    
    const [assignForm, setAssignForm] = useState({ user_id: '', role: 'member' });
    const [showAssignModal, setShowAssignModal] = useState(false);
    
    // Manage Project Details
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', description: '', total_value: 0, amount_paid: 0, status: '', sow: '' });

    const load = async () => {
        try {
            const [pRes, tRes, eRes, cpRes, iRes, uRes] = await Promise.all([
                projectAPI.getOne(id),
                taskAPI.getByProject(id),
                hasElevated ? employeeAPI.getAll() : Promise.resolve({ data: { employees: [] } }),
                isClient ? chatPermissionAPI.getAll() : Promise.resolve({ data: [] }),
                isAdmin ? incomeAPI.getAll({ project_id: id }) : Promise.resolve({ data: [] }),
                projectAPI.getUpdates(id)
            ]);
            setProject(pRes.data.project || pRes.data);
            setTasks(tRes.data.tasks || []);
            setEmployees(eRes.data.employees || []);
            setChatPermissions(cpRes.data || []);
            setProjectIncome(iRes.data || []);
            setProjectUpdates(uRes.data || []);
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

    const handleRequestChat = async (employeeId) => {
        try {
            await chatPermissionAPI.request({ user_id: employeeId, project_id: id });
            toast('Chat request sent to admin!');
            load();
        } catch (err) {
            toast(err.response?.data?.error || 'Request failed', 'error');
        }
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await projectAPI.update(id, editForm);
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

    if (loading) return <div className="spinner" />;

    const columns = [
        { id: 'todo', title: 'To Do', color: 'gray' },
        { id: 'doing', title: 'In Progress', color: 'blue' },
        { id: 'done', title: 'Completed', color: 'green' }
    ];

    return (
        <div className="page-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginBottom: 24 }}>
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0 }}>Project Description</h3>
                        {isAdmin && (
                            <button className="btn btn-sm btn-secondary" onClick={() => {
                                setEditForm({
                                    name: project.name,
                                    description: project.description,
                                    total_value: project.total_value,
                                    amount_paid: project.amount_paid,
                                    status: project.status,
                                    sow: project.sow || ''
                                });
                                setShowEditModal(true);
                            }}>Edit Details</button>
                        )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{project?.description || 'No description provided.'}</p>
                </div>

                <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: '1rem' }}>Team Members</h3>
                        {hasElevated && (
                            <button className="btn btn-sm btn-secondary" onClick={() => setShowAssignModal(true)}>
                                <Plus size={12} /> Add
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {project?.assignments?.map(assign => (
                            <div key={assign.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>
                                        {assign.user?.name[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{assign.user?.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{assign.role}</div>
                                    </div>
                                </div>
                                {hasElevated && (
                                    <button 
                                        className="btn btn-sm" 
                                        style={{ color: 'var(--red-500)', padding: 4 }}
                                        onClick={() => handleRemoveMember(assign.user_id)}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                                {isClient && (
                                    (() => {
                                        const perm = chatPermissions.find(p => p.user_id === assign.user_id);
                                        if (!perm) {
                                            return <button className="btn btn-sm btn-primary" onClick={() => handleRequestChat(assign.user_id)}>Request Chat</button>;
                                        }
                                        if (perm.status === 'requested') {
                                            return <span className="badge blue" style={{ fontSize: '0.65rem' }}>Waiting Admin</span>;
                                        }
                                        if (perm.status === 'approved') {
                                            return <button className="btn btn-sm btn-secondary" onClick={() => navigate('/chat')}>Open Chat</button>;
                                        }
                                        return <span className="badge red" style={{ fontSize: '0.65rem' }}>Denied</span>;
                                    })()
                                )}
                            </div>
                        ))}
                        {(!project?.assignments || project.assignments.length === 0) && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No members assigned yet.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="tabs" style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'tasks' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'tasks' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600 }}>Tasks</button>
                <button className={`tab ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'updates' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'updates' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600 }}>Project Timeline</button>
                {isAdmin && (
                    <button className={`tab ${activeTab === 'financials' ? 'active' : ''}`} onClick={() => setActiveTab('financials')} style={{ background: 'none', border: 'none', borderBottom: activeTab === 'financials' ? '2px solid var(--primary-500)' : 'none', color: activeTab === 'financials' ? 'var(--primary-600)' : 'var(--text-muted)', paddingBottom: 12, fontWeight: 600 }}>Financials</button>
                )}
            </div>

            {activeTab === 'tasks' ? (
                <div className="kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, height: 'calc(100vh - 250px)', minHeight: 500 }}>
                {columns.map(col => (
                    <div key={col.id} className="kanban-column" style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${col.color}-500)` }} />
                                {col.title}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({tasks.filter(t => t.status === col.id).length})</span>
                            </h3>
                        </div>
                        <div className="kanban-cards" style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {tasks.filter(t => t.status === col.id).map(task => (
                                <div key={task.id} className="kanban-card" style={{ background: 'var(--bg-app)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span className={`badge ${task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'amber' : 'blue'}`} style={{ fontSize: '0.6rem' }}>
                                            {task.priority.toUpperCase()}
                                        </span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                onClick={() => handleDeleteTask(task.id)}
                                                style={{ padding: 4, background: 'none', border: 'none', color: 'var(--red-400)', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <h4 style={{ fontSize: '0.9rem', margin: '0 0 8px 0', fontWeight: 600 }}>{task.title}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>{task.description}</p>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                        {task.assignee ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                                                    {task.assignee.name[0]}
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{task.assignee.name.split(' ')[0]}</span>
                                            </div>
                                        ) : <div />}

                                        <select
                                            value={task.status}
                                            onChange={(e) => updateTaskStatus(task, e.target.value)}
                                            style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                                        >
                                            <option value="todo">To Do</option>
                                            <option value="doing">In Progress</option>
                                            <option value="done">Done</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            ) : activeTab === 'updates' ? (
                <div className="updates-tab">
                    {(hasElevated || project?.assignments?.some(a => a.user_id === me.id && a.role === 'lead')) && (
                        <div style={{ marginBottom: 24, textAlign: 'right' }}>
                            <button className="btn btn-primary" onClick={() => setShowUpdateModal(true)}>
                                <Plus size={16} /> Post Project Update
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
                        <div className="stat-card" style={{ border: '1px solid var(--border)', padding: 16, borderRadius: 12 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project Value</label>
                            <h3 style={{ margin: '4px 0 0 0', color: 'var(--primary-600)' }}>${project?.total_value?.toLocaleString() || '0'}</h3>
                        </div>
                        <div className="stat-card" style={{ border: '1px solid var(--border)', padding: 16, borderRadius: 12 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Paid</label>
                            <h3 style={{ margin: '4px 0 0 0', color: 'var(--green-600)' }}>${project?.amount_paid?.toLocaleString() || '0'}</h3>
                        </div>
                        <div className="stat-card" style={{ border: '1px solid var(--border)', padding: 16, borderRadius: 12 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Remaining</label>
                            <h3 style={{ margin: '4px 0 0 0', color: 'var(--amber-600)' }}>${((project?.total_value || 0) - (project?.amount_paid || 0)).toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="timeline" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {projectUpdates.map((upd, idx) => (
                            <div key={idx} className="card" style={{ padding: 24, borderLeft: '4px solid var(--primary-500)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{upd.title}</h4>
                                        <small style={{ color: 'var(--text-muted)' }}>Posted by {upd.author?.name} &bull; {new Date(upd.created_at).toLocaleString()}</small>
                                    </div>
                                    {upd.link && (
                                        <a href={upd.link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                                            Visit Link
                                        </a>
                                    )}
                                </div>
                                <p style={{ margin: '0 0 20px 0', lineHeight: 1.6, color: 'var(--text-main)' }}>{upd.description}</p>
                                
                                <div className="comments-section" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                                    <h5 style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-muted)' }}>Comments ({upd.comments?.length || 0})</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                                        {upd.comments?.map(c => (
                                            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                                    {c.user?.name[0]}
                                                </div>
                                                <div style={{ background: 'var(--bg-app)', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--border)', flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.user?.name}</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        const content = e.target.comment.value;
                                        if (!content) return;
                                        projectAPI.postComment({ update_id: upd.id, content }).then(() => {
                                            e.target.comment.value = '';
                                            load();
                                        });
                                    }} style={{ display: 'flex', gap: 8 }}>
                                        <input name="comment" placeholder="Write a comment..." style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
                                        <button type="submit" className="btn btn-sm btn-primary">Post</button>
                                    </form>
                                </div>
                            </div>
                        ))}
                        {projectUpdates.length === 0 && (
                            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                No updates have been posted for this project.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ marginBottom: 20 }}>Project Income & Payments</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
                        <div className="stat-card" style={{ border: '1px solid var(--border)' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Billed Total</label>
                            <h4>${projectIncome.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</h4>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: 12 }}>Date</th>
                                <th style={{ padding: 12 }}>Source</th>
                                <th style={{ padding: 12 }}>Amount</th>
                                <th style={{ padding: 12 }}>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectIncome.map(inc => (
                                <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: 12 }}>{new Date(inc.date).toLocaleDateString()}</td>
                                    <td style={{ padding: 12 }}>{inc.source}</td>
                                    <td style={{ padding: 12 }}>${inc.amount.toLocaleString()}</td>
                                    <td style={{ padding: 12 }}><span className="badge gray">{inc.category}</span></td>
                                </tr>
                            ))}
                            {projectIncome.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No income records for this project.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showTaskModal && (
                <Modal title="Create New Task" onClose={() => setShowTaskModal(false)}>
                    <form onSubmit={handleCreateTask}>
                        <div className="form-group">
                            <label>Task Title</label>
                            <input required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="E.g. Fix login bug" />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Description</label>
                            <textarea rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
                        </div>
                        <div className="form-grid" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label>Priority</label>
                                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assignee</label>
                                <select value={taskForm.assignee_id} onChange={e => setTaskForm({ ...taskForm, assignee_id: e.target.value })}>
                                    <option value="">Unassigned</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Task'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            {showAssignModal && (
                <Modal title="Assign Team Member" onClose={() => setShowAssignModal(false)}>
                    <form onSubmit={handleAssignMember}>
                        <div className="form-group">
                            <label>Employee</label>
                            <select required value={assignForm.user_id} onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}>
                                <option value="">Select an employee...</option>
                                {employees.filter(e => e.role !== 'client' && e.role !== 'prospect').map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Role in Project</label>
                            <select value={assignForm.role} onChange={e => setAssignForm({ ...assignForm, role: e.target.value })}>
                                <option value="member">Member</option>
                                <option value="lead">Project Lead</option>
                            </select>
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Assigning...' : 'Assign to Project'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            {showUpdateModal && (
                <Modal title="Post Project Update" onClose={() => setShowUpdateModal(false)}>
                    <form onSubmit={handleCreateUpdate}>
                        <div className="form-group">
                            <label>Update Title</label>
                            <input required value={updateForm.title} onChange={e => setUpdateForm({ ...updateForm, title: e.target.value })} placeholder="E.g. Phase 1 Completed" />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Description</label>
                            <textarea rows={4} required value={updateForm.description} onChange={e => setUpdateForm({ ...updateForm, description: e.target.value })} placeholder="Detailed update for the client..." />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>External Link (Optional)</label>
                            <input value={updateForm.link} onChange={e => setUpdateForm({ ...updateForm, link: e.target.value })} placeholder="E.g. https://staging.example.com" />
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting...' : 'Post Update'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showEditModal && (
                <Modal title="Manage Project Details" onClose={() => setShowEditModal(false)}>
                    <form onSubmit={handleUpdateProject}>
                        <div className="form-group">
                            <label>Project Name</label>
                            <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Description</label>
                            <textarea rows={4} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Statement of Work (SOW)</label>
                            <textarea rows={6} value={editForm.sow} onChange={e => setEditForm({ ...editForm, sow: e.target.value })} placeholder="Enter project agreement details..." />
                        </div>
                        <div className="form-grid" style={{ marginTop: 15 }}>
                            <div className="form-group">
                                <label>Total Value ($)</label>
                                <input type="number" value={editForm.total_value} onChange={e => setEditForm({ ...editForm, total_value: parseFloat(e.target.value) })} />
                            </div>
                            <div className="form-group">
                                <label>Amount Paid ($)</label>
                                <input type="number" value={editForm.amount_paid} onChange={e => setEditForm({ ...editForm, amount_paid: parseFloat(e.target.value) })} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label>Status</label>
                            <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                <option value="planning">Planning</option>
                                <option value="active">Active</option>
                                <option value="on_hold">On Hold</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div className="form-actions" style={{ marginTop: 20 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Project'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
