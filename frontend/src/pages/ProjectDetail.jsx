import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, taskAPI, employeeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import { ChevronLeft, Plus, MoreVertical, Calendar, User, Trash2, GripVertical } from 'lucide-react';

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasElevated } = useAuth();
    const toast = useToast();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', project_id: id });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const [pRes, tRes, eRes] = await Promise.all([
                projectAPI.getOne(id),
                taskAPI.getByProject(id),
                hasElevated ? employeeAPI.getAll() : Promise.resolve({ data: { employees: [] } })
            ]);
            setProject(pRes.data);
            setTasks(tRes.data.tasks || []);
            setEmployees(eRes.data.employees || []);
        } catch { navigate('/projects'); } finally { setLoading(false); }
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

    if (loading) return <div className="spinner" />;

    const columns = [
        { id: 'todo', title: 'To Do', color: 'gray' },
        { id: 'doing', title: 'In Progress', color: 'blue' },
        { id: 'done', title: 'Completed', color: 'green' }
    ];

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 24 }}>
                <div className="header-left">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 8 }}>
                        <ChevronLeft size={14} /> Back to Projects
                    </button>
                    <h1>{project?.name}</h1>
                    <p>{project?.description?.substring(0, 100)}...</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>

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
        </div>
    );
}
