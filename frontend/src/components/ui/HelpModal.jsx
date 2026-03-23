import React from 'react';
import Modal from './Modal';
import { helpContent } from '../../context/HelpContent';
import { BookOpen, HelpCircle, Layers, Lightbulb } from 'lucide-react';

export default function HelpModal({ path, onClose }) {
    const info = helpContent[path] || helpContent[Object.keys(helpContent).find(k => path.startsWith(k))];

    if (!info) {
        return (
            <Modal title="Help & Information" onClose={onClose}>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <HelpCircle size={48} color="var(--primary-400)" style={{ marginBottom: 16, opacity: 0.5 }} />
                    <h3>Need Assistance?</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Documentation for this specific page is currently being compiled. Please refer to our general user manual or contact support.</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal title={info.title} onClose={onClose}>
            <div className="help-modal-content" style={{ padding: '0 10px' }}>
                <div style={{ background: 'var(--primary-50)', padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--primary-100)' }}>
                    <Lightbulb size={20} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-800)', lineHeight: 1.5 }}>{info.description}</p>
                </div>

                <div style={{ display: 'grid', gap: 20 }}>
                    {info.sections.map((sec, idx) => (
                        <div key={idx} style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--blue-50)', color: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Layers size={14} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{sec.title}</h4>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{sec.text}</p>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <BookOpen size={14} />
                        Want a deeper dive? Visit our full <a href="/docs" style={{ color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600 }}>Documentation Portal</a>
                    </p>
                </div>
            </div>
        </Modal>
    );
}
