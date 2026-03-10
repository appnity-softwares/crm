import { useState, useEffect } from 'react';
import { ticketAPI } from '../services/api';
import DataTable from '../components/ui/DataTable';
import { LifeBuoy, CheckCircle, Clock } from 'lucide-react';

export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const res = await ticketAPI.getAll();
            setTickets(res.data.tickets || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleUpdateStatus = async (id, status) => {
        try {
            await ticketAPI.updateStatus(id, status);
            load();
        } catch { }
    };

    const columns = [
        { header: 'Project', accessor: r => r.project?.name || '—' },
        { header: 'Subject', accessor: 'subject', render: r => <span style={{ fontWeight: 600 }}>{r.subject}</span> },
        {
            header: 'Priority',
            accessor: 'priority',
            render: r => <span className={`badge ${r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'blue'}`}>{r.priority}</span>
        },
        {
            header: 'Status',
            accessor: 'status',
            render: r => <span className={`badge ${r.status === 'open' ? 'red' : r.status === 'closed' ? 'green' : 'blue'}`}>{r.status}</span>
        },
        { header: 'Date', accessor: r => new Date(r.created_at).toLocaleDateString() },
        {
            header: 'Actions',
            render: r => (
                <div style={{ display: 'flex', gap: 6 }}>
                    {r.status !== 'closed' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleUpdateStatus(r.id, 'closed')}>
                            <CheckCircle size={12} /> Mark Closed
                        </button>
                    )}
                    {r.status === 'open' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleUpdateStatus(r.id, 'in_progress')}>
                            <Clock size={12} /> In Progress
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="page-content">
            <div className="header" style={{ marginBottom: 24 }}>
                <div className="header-left">
                    <h1>Support Tickets</h1>
                    <p>Manage and respond to client support requests</p>
                </div>
            </div>

            <div className="card">
                {loading ? <div className="spinner" /> : (
                    <DataTable
                        columns={columns}
                        data={tickets}
                        pageSize={10}
                        searchable={true}
                    />
                )}
            </div>
        </div>
    );
}
