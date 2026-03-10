import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, User, Search, MessageSquare } from 'lucide-react';
import { io } from 'socket.io-client';

const SOCKET_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://crmapi.appnity.cloud';

export default function Chat() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const scrollRef = useRef();
    const socketRef = useRef();
    const selectedUserRef = useRef(selectedUser);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            forceNew: true,
            reconnectionAttempts: 5,
            timeout: 10000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to chat server');
            socket.emit('join', me.id);
        });

        socket.on('message', (msg) => {
            const currentSelected = selectedUserRef.current;
            // Update messages if it's from the person we are chatting with
            if (currentSelected && (msg.sender_id === currentSelected.id || msg.sender_id === me.id)) {
                setMessages(prev => {
                    // Avoid duplicate messages if sender also added locally
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        return () => socket.disconnect();
    }, [me.id]);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const res = await chatAPI.getConversations();
                setUsers(res.data.users || []);
            } catch { } finally { setLoading(false); }
        };
        loadUsers();
    }, []);

    useEffect(() => {
        if (!selectedUser) return;
        const loadHistory = async () => {
            try {
                const res = await chatAPI.getHistory(selectedUser.id);
                setMessages(res.data.messages || []);
            } catch { }
        };
        loadHistory();
    }, [selectedUser]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !selectedUser) return;
        try {
            const res = await chatAPI.send({ receiver_id: selectedUser.id, content: input });
            // Since we emit through socket, let's also emit it locally or wait for socket event
            // The backend broadcast currently sends to the receiver room.
            // We should also ensure the sender sees it immediately.
            setMessages([...messages, res.data]);
            socketRef.current.emit('message', res.data);
            setInput('');
        } catch { }
    };

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="page-content" style={{ height: 'calc(100vh - 120px)', padding: 0 }}>
            <div className="chat-container" style={{ display: 'flex', height: '100%', background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {/* User List */}
                <div className="chat-sidebar" style={{ width: 300, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)' }}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {filteredUsers.map(u => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                style={{
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    cursor: 'pointer',
                                    background: selectedUser?.id === u.id ? 'var(--primary-50)' : 'transparent',
                                    borderLeft: selectedUser?.id === u.id ? '4px solid var(--primary-500)' : '4px solid transparent'
                                }}
                            >
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                    {u.name[0]}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.designation}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
                    {selectedUser ? (
                        <>
                            <div className="chat-header" style={{ padding: '12px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {selectedUser.name[0]}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{selectedUser.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--green-500)' }}>Online</div>
                                </div>
                            </div>

                            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {messages.map(m => (
                                    <div
                                        key={m.id}
                                        style={{
                                            maxWidth: '70%',
                                            alignSelf: m.sender_id === me.id ? 'flex-end' : 'flex-start',
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: m.sender_id === me.id ? 'var(--primary-500)' : 'var(--bg-card)',
                                            color: m.sender_id === me.id ? 'white' : 'var(--text-main)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.9rem' }}>{m.content}</div>
                                        <div style={{ fontSize: '0.65rem', marginTop: 4, textAlign: 'right', opacity: 0.7 }}>
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>

                            <form onSubmit={handleSend} style={{ padding: 20, background: 'var(--bg-card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-hover)' }}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary" style={{ borderRadius: 10, padding: '0 20px' }}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <MessageSquare size={64} style={{ marginBottom: 16, opacity: 0.1 }} />
                            <p>Select an employee to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
