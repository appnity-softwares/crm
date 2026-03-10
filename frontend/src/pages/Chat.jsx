import { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Search, MessageSquare, ChevronLeft, Smile, Clock, CheckCheck } from 'lucide-react';

export default function Chat() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);
    const scrollRef = useRef();
    const inputRef = useRef();
    const pollingRef = useRef();
    const selectedUserRef = useRef(selectedUser);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    // Load users
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const res = await chatAPI.getConversations();
                setUsers(res.data.users || []);
            } catch (err) {
                console.error('Failed to load users:', err);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    // Load history when user selected
    const loadHistory = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const res = await chatAPI.getHistory(userId);
            setMessages(res.data.messages || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        }
    }, []);

    useEffect(() => {
        if (!selectedUser) return;
        loadHistory(selectedUser.id);
    }, [selectedUser, loadHistory]);

    // Poll for new messages every 3 seconds
    useEffect(() => {
        if (!selectedUser) return;

        pollingRef.current = setInterval(() => {
            loadHistory(selectedUser.id);
        }, 3000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [selectedUser, loadHistory]);

    // Auto-scroll
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on user select
    useEffect(() => {
        if (selectedUser) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [selectedUser]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !selectedUser || sending) return;

        const content = input.trim();
        setInput('');
        setSending(true);

        // Optimistic update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_id: me.id,
            receiver_id: selectedUser.id,
            content,
            created_at: new Date().toISOString(),
            _sending: true,
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await chatAPI.send({ receiver_id: selectedUser.id, content });
            // Replace temp message with real one
            setMessages(prev =>
                prev.map(m => m.id === tempMsg.id ? { ...res.data, _sending: false } : m)
            );
        } catch (err) {
            console.error('Failed to send:', err);
            // Mark as failed
            setMessages(prev =>
                prev.map(m => m.id === tempMsg.id ? { ...m, _failed: true, _sending: false } : m)
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleRetry = async (msg) => {
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        setInput(msg.content);
        inputRef.current?.focus();
    };

    const handleSelectUser = (u) => {
        setSelectedUser(u);
        setShowMobileSidebar(false);
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase())
    );

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSeparator = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const getDateKey = (dateStr) => new Date(dateStr).toDateString();

    // Group messages by date
    const groupedMessages = [];
    let lastDate = '';
    messages.forEach(m => {
        const dateKey = getDateKey(m.created_at);
        if (dateKey !== lastDate) {
            groupedMessages.push({ type: 'date', date: m.created_at });
            lastDate = dateKey;
        }
        groupedMessages.push({ type: 'msg', ...m });
    });

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (name) => {
        if (!name) return 'hsl(220, 70%, 50%)';
        const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        return `hsl(${hash % 360}, 65%, 50%)`;
    };

    return (
        <div className="page-content" style={{ height: 'calc(100vh - 120px)', padding: 0 }}>
            <div className="chat-wrapper" style={{
                display: 'flex',
                height: '100%',
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--chat-bg, var(--bg-card))',
                boxShadow: 'var(--shadow-lg)',
            }}>
                {/* ── Sidebar ── */}
                <div className="chat-sidebar" style={{
                    width: 340,
                    borderRight: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-card)',
                    transition: 'all 0.3s ease',
                }}>
                    {/* Sidebar Header */}
                    <div style={{
                        padding: '20px 20px 16px',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 16,
                        }}>
                            <h2 style={{
                                fontSize: '1.25rem', fontWeight: 800,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.3px',
                            }}>
                                <MessageSquare size={20} style={{
                                    display: 'inline', verticalAlign: 'text-bottom', marginRight: 8,
                                    color: 'var(--primary-500)'
                                }} />
                                Conversations
                            </h2>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 700,
                                background: 'var(--primary-500)',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: 20,
                            }}>
                                {users.length}
                            </span>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Search size={15} style={{
                                position: 'absolute', left: 12, top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--text-muted)',
                                pointerEvents: 'none',
                            }} />
                            <input
                                id="chat-search"
                                type="text"
                                placeholder="Search people..."
                                style={{
                                    width: '100%', padding: '10px 14px 10px 38px',
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-hover)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.88rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                }}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onFocus={e => {
                                    e.target.style.borderColor = 'var(--primary-500)';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
                                }}
                                onBlur={e => {
                                    e.target.style.borderColor = 'var(--border)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* User List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                        {loading ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem',
                            }}>
                                <div className="chat-loading-spinner" />
                                Loading...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: 40,
                                color: 'var(--text-muted)', fontSize: '0.85rem',
                            }}>
                                No users found
                            </div>
                        ) : (
                            filteredUsers.map(u => {
                                const isActive = selectedUser?.id === u.id;
                                return (
                                    <div
                                        key={u.id}
                                        id={`chat-user-${u.id}`}
                                        onClick={() => handleSelectUser(u)}
                                        style={{
                                            padding: '12px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            cursor: 'pointer',
                                            borderRadius: 12,
                                            marginBottom: 2,
                                            background: isActive
                                                ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
                                                : 'transparent',
                                            color: isActive ? '#fff' : 'inherit',
                                            transition: 'all 0.2s ease',
                                            transform: isActive ? 'scale(1.01)' : 'scale(1)',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'var(--bg-hover)';
                                                e.currentTarget.style.transform = 'scale(1.01)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }
                                        }}
                                    >
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: isActive
                                                ? 'rgba(255,255,255,0.2)'
                                                : getAvatarColor(u.name),
                                            color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.85rem',
                                            flexShrink: 0,
                                            boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                                        }}>
                                            {getInitials(u.name)}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{
                                                fontWeight: 700, fontSize: '0.9rem',
                                                color: isActive ? '#fff' : 'var(--text-primary)',
                                            }}>
                                                {u.name}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {u.designation || u.role || 'Team Member'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Chat Area ── */}
                <div className="chat-main" style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    background: 'var(--chat-area-bg, var(--bg-body))',
                    position: 'relative',
                }}>
                    {selectedUser ? (
                        <>
                            {/* Chat Header */}
                            <div className="chat-header" style={{
                                padding: '14px 24px',
                                background: 'var(--bg-card)',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', gap: 14,
                                backdropFilter: 'blur(12px)',
                            }}>
                                <button
                                    className="chat-back-btn"
                                    onClick={() => {
                                        setShowMobileSidebar(true);
                                        setSelectedUser(null);
                                    }}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--text-muted)',
                                        display: 'none', cursor: 'pointer', padding: 4, borderRadius: 8,
                                    }}
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: getAvatarColor(selectedUser.name),
                                    color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.85rem', fontWeight: 800,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}>
                                    {getInitials(selectedUser.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontWeight: 700, fontSize: '1rem',
                                        color: 'var(--text-primary)',
                                    }}>
                                        {selectedUser.name}
                                    </div>
                                    <div style={{
                                        fontSize: '0.72rem', fontWeight: 600,
                                        color: '#22c55e',
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}>
                                        <span style={{
                                            width: 7, height: 7, borderRadius: '50%',
                                            background: '#22c55e',
                                            display: 'inline-block',
                                            boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                                        }} />
                                        Online
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="chat-messages" style={{
                                flex: 1, overflowY: 'auto', padding: '20px 24px',
                                display: 'flex', flexDirection: 'column', gap: 4,
                            }}>
                                {groupedMessages.length === 0 && (
                                    <div style={{
                                        flex: 1, display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--text-muted)', gap: 8,
                                    }}>
                                        <Smile size={48} style={{ opacity: 0.2 }} />
                                        <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                            Start a conversation with {selectedUser.name}
                                        </p>
                                    </div>
                                )}

                                {groupedMessages.map((item, i) => {
                                    if (item.type === 'date') {
                                        return (
                                            <div key={`date-${i}`} style={{
                                                textAlign: 'center', margin: '16px 0 8px',
                                            }}>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    color: 'var(--text-muted)',
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border)',
                                                    padding: '4px 14px',
                                                    borderRadius: 20,
                                                    letterSpacing: '0.3px',
                                                    textTransform: 'uppercase',
                                                }}>
                                                    {formatDateSeparator(item.date)}
                                                </span>
                                            </div>
                                        );
                                    }

                                    const isMine = item.sender_id === me.id;
                                    const isFailed = item._failed;
                                    const isSending = item._sending;

                                    return (
                                        <div
                                            key={item.id}
                                            style={{
                                                maxWidth: '72%',
                                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                                animation: 'chatMsgIn 0.25s ease-out',
                                            }}
                                        >
                                            <div style={{
                                                padding: '10px 16px',
                                                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                background: isFailed
                                                    ? 'rgba(239,68,68,0.15)'
                                                    : isMine
                                                        ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
                                                        : 'var(--bg-card)',
                                                color: isFailed
                                                    ? 'var(--red-500)'
                                                    : isMine ? '#fff' : 'var(--text-primary)',
                                                boxShadow: isMine
                                                    ? '0 2px 12px rgba(59,130,246,0.2)'
                                                    : '0 1px 4px rgba(0,0,0,0.08)',
                                                border: isMine ? 'none' : '1px solid var(--border)',
                                                position: 'relative',
                                                opacity: isSending ? 0.7 : 1,
                                            }}>
                                                <div style={{ fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                                    {item.content}
                                                </div>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                    gap: 4, marginTop: 4,
                                                }}>
                                                    {isFailed && (
                                                        <button
                                                            onClick={() => handleRetry(item)}
                                                            style={{
                                                                background: 'none', border: 'none',
                                                                color: 'var(--red-500)',
                                                                fontSize: '0.65rem', fontWeight: 700,
                                                                cursor: 'pointer', textDecoration: 'underline',
                                                            }}
                                                        >
                                                            Retry
                                                        </button>
                                                    )}
                                                    {isSending && (
                                                        <Clock size={11} style={{ opacity: 0.5 }} />
                                                    )}
                                                    <span style={{
                                                        fontSize: '0.62rem',
                                                        opacity: 0.6,
                                                        fontWeight: 500,
                                                    }}>
                                                        {formatTime(item.created_at)}
                                                    </span>
                                                    {isMine && !isFailed && !isSending && (
                                                        <CheckCheck size={13} style={{
                                                            opacity: 0.6,
                                                            color: item.is_read ? '#22c55e' : 'currentColor',
                                                        }} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSend} style={{
                                padding: '16px 24px',
                                background: 'var(--bg-card)',
                                borderTop: '1px solid var(--border)',
                                display: 'flex', gap: 12, alignItems: 'center',
                            }}>
                                <input
                                    id="chat-message-input"
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Type a message..."
                                    style={{
                                        flex: 1, padding: '12px 18px',
                                        borderRadius: 14,
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-hover)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                    }}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onFocus={e => {
                                        e.target.style.borderColor = 'var(--primary-500)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
                                    }}
                                    onBlur={e => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                                <button
                                    id="chat-send-btn"
                                    type="submit"
                                    disabled={!input.trim() || sending}
                                    style={{
                                        width: 48, height: 48,
                                        borderRadius: 14,
                                        border: 'none',
                                        background: input.trim()
                                            ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
                                            : 'var(--bg-hover)',
                                        color: input.trim() ? '#fff' : 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: input.trim() ? 'pointer' : 'default',
                                        transition: 'all 0.2s ease',
                                        flexShrink: 0,
                                        boxShadow: input.trim() ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                                    }}
                                    onMouseEnter={e => {
                                        if (input.trim()) e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Empty State */
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', gap: 16, padding: 40,
                        }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: '50%',
                                background: 'var(--bg-hover)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px dashed var(--border)',
                            }}>
                                <MessageSquare size={40} style={{ opacity: 0.3, color: 'var(--primary-500)' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{
                                    fontSize: '1.2rem', fontWeight: 700,
                                    color: 'var(--text-primary)', marginBottom: 6,
                                }}>
                                    Welcome to Chat
                                </h3>
                                <p style={{ fontSize: '0.88rem', maxWidth: 300, lineHeight: 1.6 }}>
                                    Select a colleague from the sidebar to start a conversation
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes chatMsgIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .chat-loading-spinner {
                    width: 16px; height: 16px;
                    border: 2px solid var(--border);
                    border-top-color: var(--primary-500);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                    margin-right: 8px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Dark mode chat area subtle pattern */
                [data-theme="dark"] .chat-messages {
                    background: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 20px,
                        rgba(255,255,255,0.005) 20px,
                        rgba(255,255,255,0.005) 40px
                    );
                }

                /* Scrollbar for chat messages */
                .chat-messages::-webkit-scrollbar {
                    width: 4px;
                }
                .chat-messages::-webkit-scrollbar-thumb {
                    background: var(--text-muted);
                    border-radius: 4px;
                    opacity: 0.4;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .chat-sidebar {
                        width: 100% !important;
                        position: absolute;
                        z-index: 10;
                        height: 100%;
                    }
                    .chat-back-btn {
                        display: flex !important;
                    }
                }
            `}</style>
        </div>
    );
}
