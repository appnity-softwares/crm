import React from 'react';
import { Clock, ClipboardCheck, Info } from 'lucide-react';

export default function LogComparison() {
    return (
        <div className="card log-comparison-card" style={{ marginBottom: 24, border: '1px solid var(--primary-100)', background: 'linear-gradient(to right, var(--bg-card), var(--primary-50))' }}>
            <div className="card-body" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: 'var(--primary-600)' }}>
                    <Info size={20} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Understanding Work Logs vs. Daily Reports</h3>
                </div>
                
                <div className="log-comparison-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="comparison-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-primary)', fontWeight: 700 }}>
                            <Clock size={16} />
                            <span>Work Logs (Time Tracking)</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Used for <strong>granular time tracking</strong>. Log exactly which project you worked on and for how many hours. This helps calculating productivity and billable hours.
                        </p>
                    </div>
                    
                    <div className="comparison-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-primary)', fontWeight: 700 }}>
                            <ClipboardCheck size={16} />
                            <span>Daily Reports (Outcome/KPIs)</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                            Used for <strong>daily achievements</strong>. Summarize your day's success, meet your KPIs, and give managers a high-level view of your progress.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
