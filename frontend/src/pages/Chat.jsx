import { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Search, MessageSquare, ChevronLeft, Smile, Clock, Check, CheckCheck, Users, MoreVertical, Edit2, Trash2, Image as ImageIcon, Link as LinkIcon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chat() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    const [editingMsg, setEditingMsg] = useState(null);
    const [editText, setEditText] = useState('');
    const [mobileView, setMobileView] = useState('list');
    
    const scrollRef = useRef();
    const inputRef = useRef();
    const pollingRef = useRef();

    useEffect(() => {
        document.body.classList.add('chat-page-active');
        return () => document.body.classList.remove('chat-page-active');
    }, []);

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

    useEffect(() => {
        loadUsers();
        const userPolling = setInterval(loadUsers, 5000);
        return () => clearInterval(userPolling);
    }, []);

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
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(() => loadHistory(selectedUser.id), 3000);
        return () => clearInterval(pollingRef.current);
    }, [selectedUser, loadHistory]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        const content = input.trim();
        if (!content || !selectedUser || sending) return;

        setInput('');
        setSending(true);

        // Basic URL detection for type
        let msgType = 'text';
        if (content.match(/\.(jpeg|jpg|gif|png)$/) != null) msgType = 'image';
        else if (content.startsWith('http')) msgType = 'link';

        try {
            await chatAPI.send({ 
                receiver_id: selectedUser.id, 
                content,
                type: msgType 
            });
            loadHistory(selectedUser.id);
        } catch (err) {
            console.error('Failed to send:', err);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editText.trim() || !editingMsg) return;
        try {
            await chatAPI.edit(editingMsg.id, { content: editText.trim() });
            setEditingMsg(null);
            setEditText('');
            loadHistory(selectedUser.id);
        } catch (err) {
            console.error('Edit failed:', err);
        }
    };

    const handleDelete = async (mid) => {
        if (!window.confirm('Delete message?')) return;
        try {
            await chatAPI.remove(mid);
            loadHistory(selectedUser.id);
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const StatusIcon = ({ status, isMine }) => {
        if (!isMine) return null;
        switch (status) {
            case 'seen': return <CheckCheck size={14} className="status-seen" />;
            case 'delivered': return <CheckCheck size={14} className="status-delivered" />;
            default: return <Check size={14} className="status-sent" />;
        }
    };

    const canEdit = (msg) => {
        const diff = Date.now() - new Date(msg.created_at).getTime();
        return diff < 2 * 60 * 60 * 1000; // 2 hours
    };

    return (
        <div className="chat-page-root">
            <div className="chat-wrapper">
                {/* Sidebar */}
                <div className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                    <div className="chat-sidebar-header">
                        <div className="chat-sidebar-header-top">
                            <h2 className="chat-sidebar-title"><MessageSquare size={20} /> Chats</h2>
                            <div className="chat-sidebar-badge"><span>{users.length}</span></div>
                        </div>
                        <div className="chat-search-wrap">
                            <Search size={15} className="chat-search-icon" />
                            <input placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="chat-user-list">
                        {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                            <div key={u.id} className={`chat-user-item ${selectedUser?.id === u.id ? 'chat-user-item--active' : ''}`} onClick={() => { setSelectedUser(u); setMobileView('chat'); }}>
                                <div className="chat-avatar" style={{ background: u.avatar ? 'transparent' : `hsl(${u.name.length * 40 % 360}, 60%, 45%)` }}>
                                    {u.avatar ? (
                                        <img src={u.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        u.name.charAt(0)
                                    )}
                                    <span className="chat-avatar-online" />
                                </div>
                                <div className="chat-user-info">
                                    <div className="chat-user-name">{u.name}</div>
                                    <div className="chat-user-role">{u.role}</div>
                                </div>
                                {u.unread_count > 0 && <div className="chat-unread-badge">{u.unread_count}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Chat */}
                <div className={`chat-main ${mobileView === 'list' ? 'chat-main--hidden' : ''}`}>
                    {selectedUser ? (
                        <>
                            <div className="chat-header">
                                <button className="chat-back-btn" onClick={() => setMobileView('list')}><ChevronLeft size={24} /></button>
                                <div className="chat-header-info">
                                    <div className="chat-header-name">{selectedUser.name}</div>
                                    <div className="chat-header-status"><span className="chat-status-dot" /> Online</div>
                                </div>
                            </div>

                            <div className="chat-messages">
                                {messages.map((m) => {
                                    const isMine = m.sender_id === me.id;
                                    const sender = isMine ? me : selectedUser;
                                    return (
                                        <div key={m.id} className={`chat-bubble-wrap ${isMine ? 'chat-bubble-wrap--mine' : 'chat-bubble-wrap--theirs'}`}>
                                            {!isMine && (
                                                <div className="chat-bubble-avatar" style={{ background: sender.avatar ? 'transparent' : `hsl(${sender.name.length * 40 % 360}, 60%, 45%)` }}>
                                                    {sender.avatar ? (
                                                        <img src={sender.avatar} alt="" />
                                                    ) : (
                                                        sender.name.charAt(0)
                                                    )}
                                                </div>
                                            )}
                                            <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                                                {m.type === 'image' ? (
                                                    <img src={m.content} alt="shared" className="chat-img-preview" />
                                                ) : (
                                                    <div className="chat-md-content">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                                    </div>
                                                )}
                                                <div className="chat-bubble-meta">
                                                    {m.is_edited && <span className="edited-label">(edited)</span>}
                                                    <span className="chat-bubble-time">{formatTime(m.created_at)}</span>
                                                    <StatusIcon status={m.status} isMine={isMine} />
                                                    
                                                    {isMine && (
                                                        <div className="msg-actions">
                                                            {canEdit(m) && <button onClick={() => { setEditingMsg(m); setEditText(m.content); }}><Edit2 size={12} /></button>}
                                                            <button onClick={() => handleDelete(m.id)}><Trash2 size={12} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>

                            <div className="chat-input-bar-container">
                                {editingMsg && (
                                    <div className="editing-bar">
                                        <span>Editing message...</span>
                                        <button onClick={() => setEditingMsg(null)}><X size={14} /></button>
                                    </div>
                                )}
                                <form onSubmit={editingMsg ? handleEdit : handleSend} className="chat-input-bar">
                                    <textarea
                                        ref={inputRef}
                                        rows={1}
                                        placeholder="Type markdown or paste link..."
                                        value={editingMsg ? editText : input}
                                        onChange={e => editingMsg ? setEditText(e.target.value) : setInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                editingMsg ? handleEdit(e) : handleSend(e);
                                            }
                                        }}
                                    />
                                    <button type="submit" className="chat-send-btn--active">
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="chat-empty-state">
                            <MessageSquare size={48} />
                            <h3>Chat Support</h3>
                            <p>Select a user to start messaging with Markdown and Media support.</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .chat-page-root { height: calc(100vh - 100px); padding: 20px; }
                .chat-wrapper { display: flex; height: 100%; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-xl); }
                .chat-sidebar { width: 300px; border-right: 1px solid var(--border); display: flex; flex-direction: column; }
                .chat-sidebar-header { padding: 20px; border-bottom: 1px solid var(--border); }
                .chat-sidebar-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
                .chat-sidebar-title { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 700; }
                .chat-search-wrap { position: relative; }
                .chat-search-wrap input { width: 100%; padding: 8px 12px 8px 35px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-primary); }
                .chat-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
                .chat-user-list { flex: 1; overflow-y: auto; }
                .chat-user-item { padding: 12px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s; }
                .chat-user-item:hover { background: var(--bg-hover); }
                .chat-user-item--active { background: var(--primary-50); border-left: 3px solid var(--primary-500); }
                .chat-avatar { width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; position: relative; }
                .chat-avatar-online { position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: #22c55e; border: 2px solid #fff; border-radius: 50%; }
                .chat-user-info { flex: 1; min-width: 0; }
                .chat-user-name { font-weight: 600; font-size: 0.9rem; }
                .chat-user-role { font-size: 0.75rem; color: var(--text-muted); }
                .chat-unread-badge { background: var(--primary-500); color: #fff; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; }

                .chat-main { flex: 1; display: flex; flex-direction: column; background: var(--bg-body); }
                .chat-header { padding: 15px 20px; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 15px; }
                .chat-back-btn { display: none; background: none; border: none; cursor: pointer; }
                .chat-header-name { font-weight: 700; }
                .chat-header-status { font-size: 0.75rem; color: #22c55e; display: flex; align-items: center; gap: 5px; }
                .chat-status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; }

                .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
                .chat-bubble-wrap { display: flex; width: 100%; }
                .chat-bubble-wrap--mine { justify-content: flex-end; }
                .chat-bubble { max-width: 70%; padding: 10px 15px; border-radius: 12px; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .chat-bubble--mine { background: var(--primary-500); color: #fff; border-bottom-right-radius: 2px; }
                .chat-bubble--theirs { background: var(--bg-card); color: var(--text-primary); border-bottom-left-radius: 2px; border: 1px solid var(--border); }
                
                .chat-md-content { font-size: 0.9rem; white-space: pre-wrap; }
                .chat-md-content p { margin-bottom: 8px; }
                .chat-md-content pre { background: rgba(0,0,0,0.1); padding: 10px; border-radius: 6px; overflow-x: auto; margin: 10px 0; }
                .chat-img-preview { max-width: 100%; border-radius: 8px; margin-bottom: 5px; }
                
                .chat-bubble-meta { font-size: 0.65rem; display: flex; align-items: center; justify-content: flex-end; gap: 5px; margin-top: 5px; opacity: 0.8; }
                .status-seen { color: #fff; }
                .status-delivered { color: rgba(255,255,255,0.7); }
                .status-sent { color: rgba(255,255,255,0.5); }
                .chat-bubble--theirs .status-seen { color: var(--primary-500); }
                
                .msg-actions { margin-left: 10px; display: flex; gap: 5px; opacity: 0; transition: 0.2s; }
                .chat-bubble:hover .msg-actions { opacity: 1; }
                .msg-actions button { background: none; border: none; color: inherit; cursor: pointer; padding: 2px; border-radius: 4px; }
                .msg-actions button:hover { background: rgba(0,0,0,0.1); }

                .chat-input-bar-container { background: var(--bg-card); border-top: 1px solid var(--border); }
                .editing-bar { padding: 5px 20px; background: var(--bg-hover); font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); }
                .chat-input-bar { padding: 15px 20px; display: flex; gap: 15px; align-items: flex-end; }
                .chat-input-bar textarea { flex: 1; background: var(--bg-body); border: 1px solid var(--border); border-radius: 8px; padding: 10px 15px; color: var(--text-primary); resize: none; min-height: 42px; max-height: 150px; font-family: inherit; }
                .chat-send-btn--active { width: 42px; height: 42px; border-radius: 50%; background: var(--primary-500); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; flex-shrink: 0; }
                .chat-send-btn--active:hover { transform: scale(1.05); background: var(--primary-600); }

                @media (max-width: 768px) {
                    .chat-sidebar { width: 100%; position: absolute; inset: 0; z-index: 10; background: var(--bg-card); }
                    .chat-sidebar--hidden { display: none; }
                    .chat-main--hidden { display: none; }
                    .chat-back-btn { display: block; }
                    .chat-page-root { padding: 0; height: calc(100vh - 60px); }
                    .chat-bubble { max-width: 85%; }
                }
            `}</style>
        </div>
    );
}
