import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import HelpModal from './HelpModal';

export default function GlobalHelpButton({ style = {} }) {
    const [showHelp, setShowHelp] = useState(false);
    const location = useLocation();

    return (
        <>
            <button 
                className="global-help-btn" 
                onClick={() => setShowHelp(true)} 
                title="Page Information & Help"
                style={{ 
                    position: 'fixed', 
                    bottom: '24px', 
                    right: '24px', 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-600)', 
                    color: 'white', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    zIndex: 9999,
                    ...style 
                }}
            >
                <HelpCircle size={24} />
            </button>

            {showHelp && <HelpModal path={location.pathname} onClose={() => setShowHelp(false)} />}
        </>
    );
}
