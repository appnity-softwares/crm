import { useState, useEffect } from 'react';
import { chatPermissionAPI } from '../services/api';
import { useToast } from '../components/ui/Toast';
import { Check, X, MessageSquare, User, FolderKanban } from 'lucide-react';
import DataTable from '../components/ui/DataTable';

export default function ChatPermissions() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const load = async () => {
        try {
            const { data } = await chatPermissionAPI.getAll();
            setPermissions(data || []);
        } catch {
            toast('Failed to load permissions', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleUpdate = async (id, status) => {
        try {
            await chatPermissionAPI.update(id, { status });
            toast(`Permission ${status}!`);
            load();
        } catch {
            toast('Update failed', 'error');
        }
    };

    const columns = [
        { 
            header: 'Client', 
            accessor: p => p.client?.name || '—',
            render: p => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                        {p.client?.name[0]}
                    </div>
                    <span>{p.client?.name}</span>
                </div>
            )
        },
        { 
            header: 'Employee', 
            accessor: p => p.user?.name || '—',
            render: p => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--amber-100)', color: 'var(--amber-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                        {p.user?.name[0]}
                    </div>
                    <span>{p.user?.name}</span>
                </div>
            )
        },
        { 
            header: 'Project', 
            accessor: p => p.project?.name || '—',
            render: p => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FolderKanban size={14} color="var(--text-muted)" />
                    <span>{p.project?.name}</span>
                </div>
            )
        },
        { 
            header: 'Status', 
            accessor: 'status',
            render: p => (
                <span className={`badge ${p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'blue'}`}>
                    {p.status.toUpperCase()}
                </span>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (p) => p.status === 'requested' && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleUpdate(p.id, 'approved')}>
                        <Check size={14} /> Approve
                    </button>
                    <button className="btn btn-sm btn-secondary" style={{ color: 'var(--red-500)' }} onClick={() => handleUpdate(p.id, 'rejected')}>
                        <X size={14} /> Reject
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="page-content">
            <div className="header">
                <div className="header-left">
                    <h1>Chat Permissions</h1>
                    <p>Manage client-employee interaction requests</p>
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                {loading ? <div className="spinner" /> : (
                    <DataTable 
                        columns={columns}
                        data={permissions}
                        pageSize={15}
                        searchable={true}
                        emptyMessage="No permission requests found."
                    />
                )}
            </div>
        </div>
    );
}
