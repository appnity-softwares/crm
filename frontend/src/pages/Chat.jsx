import { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Send, Search, MessageSquare, ChevronLeft, Smile, Clock, CheckCheck, Users, MoreVertical } from 'lucide-react';

export default function Chat() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sending, setSending] = useState(false);
    // Mobile view state: 'list' or 'chat'
    const [mobileView, setMobileView] = useState('list');
    const scrollRef = useRef();
    const inputRef = useRef();
    const pollingRef = useRef();
    const selectedUserRef = useRef(selectedUser);

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    // Hide the floating nav (app sidebar) when chat is active on mobile
    useEffect(() => {
        document.body.classList.add('chat-page-active');
        return () => document.body.classList.remove('chat-page-active');
    }, []);

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
        const userPolling = setInterval(loadUsers, 5000);
        return () => clearInterval(userPolling);
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

    // Focus input on user select (desktop only)
    useEffect(() => {
        if (selectedUser && window.innerWidth > 768) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [selectedUser]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !selectedUser || sending) return;

        const content = input.trim();
        setInput('');
        setSending(true);

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
            setMessages(prev =>
                prev.map(m => m.id === tempMsg.id ? { ...res.data, _sending: false } : m)
            );
            // Update last message time for sorting
            setUsers(prev => prev.map(u => 
                u.id === selectedUser.id ? { ...u, last_message_at: new Date().toISOString() } : u
            ));
        } catch (err) {
            console.error('Failed to send:', err);
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
        setMobileView('chat');
        // Clear unread count locally
        setUsers(prev => prev.map(user => 
            user.id === u.id ? { ...user, unread_count: 0 } : user
        ));
    };

    const handleBackToList = () => {
        setMobileView('list');
        // Don't clear selectedUser on desktop
        if (window.innerWidth <= 768) {
            setTimeout(() => setSelectedUser(null), 300);
        }
    };

    const filteredUsers = users
        .filter(u => u.name?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const dateA = new Date(a.last_message_at || 0);
            const dateB = new Date(b.last_message_at || 0);
            return dateB - dateA;
        });

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
        return `hsl(${hash % 360}, 60%, 45%)`;
    };

    return (
        <div className="chat-page-root">
            <div className="chat-wrapper">
                {/* ══════════════ SIDEBAR / CONTACT LIST ══════════════ */}
                <div className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                    {/* Sidebar Header */}
                    <div className="chat-sidebar-header">
                        <div className="chat-sidebar-header-top">
                            <h2 className="chat-sidebar-title">
                                <MessageSquare size={20} className="chat-sidebar-title-icon" />
                                Chats
                            </h2>
                            <div className="chat-sidebar-badge">
                                <Users size={12} />
                                <span>{users.length}</span>
                            </div>
                        </div>
                        <div className="chat-search-wrap">
                            <Search size={15} className="chat-search-icon" />
                            <input
                                id="chat-search"
                                type="text"
                                placeholder="Search people..."
                                className="chat-search-input"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* User List */}
                    <div className="chat-user-list">
                        {loading ? (
                            <div className="chat-empty-state">
                                <div className="chat-loading-spinner" />
                                <span>Loading contacts...</span>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="chat-empty-state">
                                <Search size={32} style={{ opacity: 0.2 }} />
                                <span>No users found</span>
                            </div>
                        ) : (
                            filteredUsers.map(u => {
                                const isActive = selectedUser?.id === u.id;
                                return (
                                    <div
                                        key={u.id}
                                        id={`chat-user-${u.id}`}
                                        className={`chat-user-item ${isActive ? 'chat-user-item--active' : ''}`}
                                        onClick={() => handleSelectUser(u)}
                                    >
                                        <div
                                            className="chat-avatar"
                                            style={{
                                                background: isActive ? 'rgba(255,255,255,0.2)' : getAvatarColor(u.name),
                                            }}
                                        >
                                            {getInitials(u.name)}
                                            <span className="chat-avatar-online" />
                                        </div>
                                        <div className="chat-user-info">
                                            <div className="chat-user-name">{u.name}</div>
                                            <div className="chat-user-role">
                                                {u.designation || u.role || 'Team Member'}
                                            </div>
                                        </div>
                                        <div className="chat-user-meta">
                                            {u.unread_count > 0 && !isActive && (
                                                <div className="chat-unread-badge">
                                                    {u.unread_count > 99 ? '99+' : u.unread_count}
                                                </div>
                                            )}
                                            <MoreVertical size={14} className="chat-user-more" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ══════════════ CHAT AREA ══════════════ */}
                <div className={`chat-main ${mobileView === 'list' ? 'chat-main--hidden' : ''}`}>
                    {selectedUser ? (
                        <>
                            {/* Chat Header */}
                            <div className="chat-header">
                                <button
                                    className="chat-back-btn"
                                    onClick={handleBackToList}
                                    aria-label="Back to contacts"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div
                                    className="chat-avatar chat-avatar--sm"
                                    style={{ background: getAvatarColor(selectedUser.name) }}
                                >
                                    {getInitials(selectedUser.name)}
                                    <span className="chat-avatar-online" />
                                </div>
                                <div className="chat-header-info">
                                    <div className="chat-header-name">{selectedUser.name}</div>
                                    <div className="chat-header-status">
                                        <span className="chat-status-dot" />
                                        Online
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="chat-messages">
                                {groupedMessages.length === 0 && (
                                    <div className="chat-empty-convo">
                                        <Smile size={48} style={{ opacity: 0.15 }} />
                                        <p>Say hello to {selectedUser.name} 👋</p>
                                    </div>
                                )}

                                {groupedMessages.map((item, i) => {
                                    if (item.type === 'date') {
                                        return (
                                            <div key={`date-${i}`} className="chat-date-sep">
                                                <span>{formatDateSeparator(item.date)}</span>
                                            </div>
                                        );
                                    }

                                    const isMine = item.sender_id === me.id;
                                    const isFailed = item._failed;
                                    const isSending = item._sending;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`chat-bubble-wrap ${isMine ? 'chat-bubble-wrap--mine' : 'chat-bubble-wrap--theirs'}`}
                                        >
                                            <div className={`chat-bubble ${isMine ? 'chat-bubble--mine' : 'chat-bubble--theirs'} ${isFailed ? 'chat-bubble--failed' : ''} ${isSending ? 'chat-bubble--sending' : ''}`}>
                                                <div className="chat-bubble-text">{item.content}</div>
                                                <div className="chat-bubble-meta">
                                                    {isFailed && (
                                                        <button
                                                            className="chat-retry-btn"
                                                            onClick={() => handleRetry(item)}
                                                        >
                                                            Retry
                                                        </button>
                                                    )}
                                                    {isSending && <Clock size={11} style={{ opacity: 0.5 }} />}
                                                    <span className="chat-bubble-time">
                                                        {formatTime(item.created_at)}
                                                    </span>
                                                    {isMine && !isFailed && !isSending && (
                                                        <CheckCheck
                                                            size={13}
                                                            className={`chat-bubble-check ${item.is_read ? 'chat-bubble-check--read' : ''}`}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={scrollRef} />
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSend} className="chat-input-bar">
                                <input
                                    id="chat-message-input"
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Type a message..."
                                    className="chat-input"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    autoComplete="off"
                                />
                                <button
                                    id="chat-send-btn"
                                    type="submit"
                                    disabled={!input.trim() || sending}
                                    className={`chat-send-btn ${input.trim() ? 'chat-send-btn--active' : ''}`}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-empty-state chat-empty-state--main">
                            <div className="chat-empty-icon-wrap">
                                <MessageSquare size={44} />
                            </div>
                            <h3>Welcome to Chat</h3>
                            <p>Select a colleague from the sidebar to start a conversation</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ══════════════ ALL STYLES ══════════════ */}
            <style>{`
                /* ── Page Root ── */
                .chat-page-root {
                    height: calc(100vh - 120px);
                    padding: 0;
                }

                .chat-wrapper {
                    display: flex;
                    height: 100%;
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid var(--border);
                    background: var(--bg-card);
                    box-shadow: var(--shadow-lg);
                    position: relative;
                }

                /* ── Sidebar ── */
                .chat-sidebar {
                    width: 340px;
                    min-width: 340px;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-card);
                    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 5;
                }

                .chat-sidebar-header {
                    padding: 20px 20px 16px;
                    border-bottom: 1px solid var(--border);
                }

                .chat-sidebar-header-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 14px;
                }

                .chat-sidebar-title {
                    font-size: 1.25rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    letter-spacing: -0.3px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                }

                .chat-sidebar-title-icon {
                    color: var(--primary-500);
                }

                .chat-sidebar-badge {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    background: var(--primary-500);
                    color: #fff;
                    padding: 3px 10px;
                    border-radius: 20px;
                }

                /* ── Search ── */
                .chat-search-wrap {
                    position: relative;
                }

                .chat-search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .chat-search-input {
                    width: 100%;
                    padding: 10px 14px 10px 38px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    background: var(--bg-hover);
                    color: var(--text-primary);
                    font-size: 0.88rem;
                    outline: none;
                    transition: all 0.2s;
                    font-family: inherit;
                }

                .chat-search-input:focus {
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
                }

                /* ── User List ── */
                .chat-user-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                    -webkit-overflow-scrolling: touch;
                }

                .chat-user-item {
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    border-radius: 12px;
                    margin-bottom: 2px;
                    transition: all 0.2s ease;
                    -webkit-tap-highlight-color: transparent;
                    position: relative;
                }

                .chat-user-item:hover {
                    background: var(--bg-hover);
                }

                .chat-user-item:active {
                    transform: scale(0.98);
                }

                .chat-user-item--active {
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-600)) !important;
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                }

                .chat-user-item--active .chat-user-name { color: #fff !important; }
                .chat-user-item--active .chat-user-role { color: rgba(255,255,255,0.7) !important; }
                .chat-user-item--active .chat-user-more { color: rgba(255,255,255,0.5) !important; }

                /* ── Avatar ── */
                .chat-avatar {
                    width: 46px;
                    height: 46px;
                    border-radius: 50%;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.85rem;
                    flex-shrink: 0;
                    position: relative;
                    letter-spacing: 0.5px;
                }

                .chat-avatar--sm {
                    width: 40px;
                    height: 40px;
                    font-size: 0.8rem;
                }

                .chat-avatar-online {
                    position: absolute;
                    bottom: 1px;
                    right: 1px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #22c55e;
                    border: 2px solid var(--bg-card);
                    box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
                }

                .chat-user-item--active .chat-avatar-online {
                    border-color: var(--primary-600);
                }

                /* ── User Info ── */
                .chat-user-info {
                    flex: 1;
                    overflow: hidden;
                    min-width: 0;
                }

                .chat-user-name {
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .chat-user-role {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-top: 2px;
                }

                .chat-user-meta {
                    flex-shrink: 0;
                }

                .chat-user-more {
                    color: var(--text-muted);
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .chat-user-item:hover .chat-user-more {
                    opacity: 1;
                }

                .chat-unread-badge {
                    background: #ef4444;
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 10px;
                    min-width: 18px;
                    text-align: center;
                    margin-bottom: 4px;
                    box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);
                }

                /* ── Chat Main ── */
                .chat-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    background: var(--bg-body);
                    min-width: 0;
                    position: relative;
                }

                /* ── Chat Header ── */
                .chat-header {
                    padding: 12px 20px;
                    background: var(--bg-card);
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-height: 64px;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }

                .chat-back-btn {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--primary-500);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 10px;
                    transition: all 0.2s;
                    -webkit-tap-highlight-color: transparent;
                    flex-shrink: 0;
                }

                .chat-back-btn:hover {
                    background: var(--bg-hover);
                }

                .chat-back-btn:active {
                    transform: scale(0.9);
                }

                .chat-header-info {
                    flex: 1;
                    min-width: 0;
                }

                .chat-header-name {
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .chat-header-status {
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: #22c55e;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .chat-status-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #22c55e;
                    display: inline-block;
                    box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
                    animation: pulse-dot 2s infinite ease-in-out;
                }

                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                /* ── Messages ── */
                .chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    -webkit-overflow-scrolling: touch;
                }

                .chat-messages::-webkit-scrollbar { width: 4px; }
                .chat-messages::-webkit-scrollbar-thumb {
                    background: var(--text-muted);
                    border-radius: 4px;
                    opacity: 0.4;
                }

                [data-theme="dark"] .chat-messages {
                    background: repeating-linear-gradient(
                        45deg, transparent, transparent 20px,
                        rgba(255,255,255,0.005) 20px, rgba(255,255,255,0.005) 40px
                    );
                }

                .chat-empty-convo {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    gap: 10px;
                }

                .chat-empty-convo p {
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                /* ── Date Separator ── */
                .chat-date-sep {
                    text-align: center;
                    margin: 14px 0 8px;
                }

                .chat-date-sep span {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    padding: 4px 16px;
                    border-radius: 20px;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                }

                /* ── Bubbles ── */
                .chat-bubble-wrap {
                    display: flex;
                    animation: chatMsgIn 0.25s ease-out;
                }

                .chat-bubble-wrap--mine { justify-content: flex-end; }
                .chat-bubble-wrap--theirs { justify-content: flex-start; }

                .chat-bubble {
                    max-width: 75%;
                    padding: 10px 16px;
                    position: relative;
                    word-break: break-word;
                }

                .chat-bubble--mine {
                    border-radius: 18px 18px 4px 18px;
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
                    color: #fff;
                    box-shadow: 0 2px 12px rgba(59, 130, 246, 0.2);
                }

                .chat-bubble--theirs {
                    border-radius: 18px 18px 18px 4px;
                    background: var(--bg-card);
                    color: var(--text-primary);
                    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
                    border: 1px solid var(--border);
                }

                .chat-bubble--failed {
                    background: rgba(239, 68, 68, 0.12) !important;
                    color: var(--red-500) !important;
                    border: 1px solid rgba(239, 68, 68, 0.3) !important;
                }

                .chat-bubble--sending { opacity: 0.65; }

                .chat-bubble-text {
                    font-size: 0.9rem;
                    line-height: 1.5;
                }

                .chat-bubble-meta {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 4px;
                    margin-top: 4px;
                }

                .chat-bubble-time {
                    font-size: 0.62rem;
                    opacity: 0.6;
                    font-weight: 500;
                }

                .chat-bubble-check { opacity: 0.6; }
                .chat-bubble-check--read { color: #22c55e !important; opacity: 1; }

                .chat-retry-btn {
                    background: none;
                    border: none;
                    color: var(--red-500);
                    font-size: 0.65rem;
                    font-weight: 700;
                    cursor: pointer;
                    text-decoration: underline;
                    padding: 0;
                }

                /* ── Input Bar ── */
                .chat-input-bar {
                    padding: 12px 16px;
                    background: var(--bg-card);
                    border-top: 1px solid var(--border);
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }

                .chat-input {
                    flex: 1;
                    padding: 12px 18px;
                    border-radius: 24px;
                    border: 1px solid var(--border);
                    background: var(--bg-hover);
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                    font-family: inherit;
                    min-width: 0;
                }

                .chat-input:focus {
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
                }

                .chat-send-btn {
                    width: 46px;
                    height: 46px;
                    border-radius: 50%;
                    border: none;
                    background: var(--bg-hover);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: default;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    -webkit-tap-highlight-color: transparent;
                }

                .chat-send-btn--active {
                    background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
                    color: #fff;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
                }

                .chat-send-btn--active:hover {
                    transform: scale(1.08);
                }

                .chat-send-btn--active:active {
                    transform: scale(0.95);
                }

                /* ── Empty State ── */
                .chat-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                    gap: 10px;
                    padding: 40px 20px;
                    height: 100%;
                }

                .chat-empty-state--main {
                    gap: 14px;
                }

                .chat-empty-state--main h3 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }

                .chat-empty-state--main p {
                    font-size: 0.88rem;
                    max-width: 280px;
                    text-align: center;
                    line-height: 1.6;
                    margin: 0;
                }

                .chat-empty-icon-wrap {
                    width: 90px;
                    height: 90px;
                    border-radius: 50%;
                    background: var(--bg-hover);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px dashed var(--border);
                    color: var(--primary-500);
                    opacity: 0.5;
                }

                /* ── Animations ── */
                @keyframes chatMsgIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .chat-loading-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid var(--border);
                    border-top-color: var(--primary-500);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin { to { transform: rotate(360deg); } }

                /* ═══════════════════════════════════════════════
                   RESPONSIVE BREAKPOINTS
                   ═══════════════════════════════════════════════ */

                /* ── Tablet (≤1024px) ── */
                @media (max-width: 1024px) {
                    .chat-sidebar {
                        width: 280px;
                        min-width: 280px;
                    }
                }

                /* ── Mobile (≤768px) — Full view switching ── */
                @media (max-width: 768px) {
                    /* Hide floating app nav so chat gets full screen */
                    body.chat-page-active .floating-nav-container,
                    body.chat-page-active .sticky-redirection-icon,
                    body.chat-page-active .floating-nav-menu {
                        display: none !important;
                    }

                    .chat-page-root {
                        height: calc(100vh - 60px);
                        height: calc(100dvh - 60px);
                    }

                    .chat-wrapper {
                        border-radius: 0;
                        border: none;
                        box-shadow: none;
                    }

                    /* Sidebar takes full width */
                    .chat-sidebar {
                        position: absolute;
                        inset: 0;
                        width: 100% !important;
                        min-width: 100% !important;
                        z-index: 10;
                        border-right: none;
                        transform: translateX(0);
                    }

                    .chat-sidebar--hidden {
                        transform: translateX(-100%);
                        pointer-events: none;
                    }

                    /* Chat takes full width */
                    .chat-main {
                        position: absolute;
                        inset: 0;
                        z-index: 5;
                        transform: translateX(0);
                        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .chat-main--hidden {
                        transform: translateX(100%);
                        pointer-events: none;
                    }

                    /* Show back button */
                    .chat-back-btn {
                        display: flex !important;
                    }

                    .chat-header {
                        padding: 10px 14px;
                        gap: 10px;
                        min-height: 56px;
                    }

                    .chat-header-name {
                        font-size: 0.95rem;
                    }

                    .chat-messages {
                        padding: 12px 14px;
                    }

                    .chat-bubble {
                        max-width: 85%;
                        padding: 9px 14px;
                    }

                    .chat-bubble-text {
                        font-size: 0.88rem;
                    }

                    .chat-input-bar {
                        padding: 10px 12px;
                        padding-bottom: max(10px, env(safe-area-inset-bottom));
                        gap: 8px;
                    }

                    .chat-input {
                        padding: 11px 16px;
                        font-size: 16px; /* Prevents iOS zoom */
                        border-radius: 22px;
                    }

                    .chat-send-btn {
                        width: 44px;
                        height: 44px;
                    }

                    .chat-sidebar-header {
                        padding: 16px 16px 14px;
                    }

                    .chat-user-item {
                        padding: 14px 12px;
                        gap: 10px;
                    }

                    .chat-avatar {
                        width: 48px;
                        height: 48px;
                    }

                    .chat-user-name {
                        font-size: 0.95rem;
                    }

                    .chat-user-more {
                        opacity: 1;
                    }

                    .chat-date-sep { margin: 10px 0 6px; }

                    .chat-empty-state--main {
                        display: none;
                    }
                }

                /* ── Small phones (≤380px) ── */
                @media (max-width: 380px) {
                    .chat-sidebar-title {
                        font-size: 1.1rem;
                    }

                    .chat-search-input {
                        font-size: 16px;
                        padding: 10px 12px 10px 36px;
                    }

                    .chat-bubble {
                        max-width: 88%;
                    }

                    .chat-avatar {
                        width: 42px;
                        height: 42px;
                        font-size: 0.78rem;
                    }
                }

                /* ── Landscape phones ── */
                @media (max-height: 500px) and (max-width: 768px) {
                    .chat-page-root {
                        height: 100vh;
                        height: 100dvh;
                    }

                    .chat-header {
                        min-height: 48px;
                        padding: 6px 12px;
                    }

                    .chat-avatar--sm {
                        width: 32px;
                        height: 32px;
                        font-size: 0.7rem;
                    }

                    .chat-input-bar {
                        padding: 6px 10px;
                    }

                    .chat-input {
                        padding: 8px 14px;
                    }

                    .chat-send-btn {
                        width: 38px;
                        height: 38px;
                    }

                    .chat-user-item {
                        padding: 8px 12px;
                    }

                    .chat-avatar {
                        width: 36px;
                        height: 36px;
                        font-size: 0.72rem;
                    }
                }
            `}</style>
        </div>
    );
}
