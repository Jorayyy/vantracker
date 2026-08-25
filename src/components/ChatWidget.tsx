'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, X, Send, ArrowLeft, Users } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  sender_name: string;
  sender_role: string;
}

interface User {
  id: string;
  full_name: string;
  role: string;
}

export default function ChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserList, setShowUserList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      if (userRole === 'driver') {
        const res = await fetch('/api/drivers?all=true');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.filter((u: User) => u.role !== 'driver'));
        }
      } else {
        const res = await fetch('/api/drivers');
        if (res.ok) {
          const data = await res.json();
          setUsers(data.map((d: any) => ({ id: d.id, full_name: d.full_name, role: 'driver' })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [userRole]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/messages?limit=50');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        const unread = data.filter((m: ChatMessage) => !m.is_read && m.sender_id !== userId).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [userId]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_ids: messageIds }),
      });
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchUsers();
      const unreadIds = messages
        .filter(m => !m.is_read && m.sender_id !== userId)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
  }, [isOpen, fetchMessages, fetchUsers, markAsRead, userId, messages]);

  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource('/api/chat/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const newMessages = JSON.parse(event.data) as ChatMessage[];
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = newMessages.filter(m => !existingIds.has(m.id));
          if (unique.length === 0) return prev;
          return [...prev, ...unique];
        });
        const incomingUnread = newMessages.filter(m => !m.is_read && m.sender_id !== userId).length;
        if (incomingUnread > 0) {
          setUnreadCount(prev => prev + incomingUnread);
        }
      } catch (err) {
        console.error('Failed to parse chat stream:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [isOpen, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          recipient_id: selectedUser?.id || null,
        }),
      });

      if (res.ok) {
        const sent = await res.json();
        setMessages(prev => {
          const exists = prev.some(m => m.id === sent.id);
          if (exists) return prev;
          return [...prev, { ...sent, sender_name: session?.user?.name || 'You', sender_role: userRole }];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredMessages = selectedUser
    ? messages.filter(m =>
        (m.sender_id === userId && m.recipient_id === selectedUser.id) ||
        (m.sender_id === selectedUser.id && m.recipient_id === userId)
      )
    : messages.filter(m => m.recipient_id === null);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-slate-700 hover:bg-slate-600 rotate-0'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style={{ height: '520px' }}>
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            {showUserList ? (
              <button onClick={() => setShowUserList(false)} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : selectedUser ? (
              <button onClick={() => { setSelectedUser(null); setShowUserList(true); }} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}

            <div className="flex-1 min-w-0">
              {selectedUser ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center text-xs font-semibold text-blue-400 shrink-0">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate">{selectedUser.full_name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{selectedUser.role}</p>
                  </div>
                </div>
              ) : showUserList ? (
                <p className="text-sm font-semibold">Select a conversation</p>
              ) : (
                <p className="text-sm font-semibold">Company Chat</p>
              )}
            </div>

            {!showUserList && !selectedUser && (
              <button
                onClick={() => setShowUserList(true)}
                className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800"
                title="Direct message"
              >
                <Users className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* User List */}
          {showUserList && !selectedUser && (
            <div className="flex-1 overflow-y-auto">
              {users.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No users found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => { setSelectedUser(user); setShowUserList(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-semibold text-slate-600 shrink-0">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {!showUserList && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No messages yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedUser ? `Start a conversation with ${selectedUser.full_name}` : 'Send a message to start chatting'}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isOwn = msg.sender_id === userId;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                        {!isOwn && (
                          <p className="text-[10px] text-slate-400 mb-1 px-1">
                            {msg.sender_name}
                          </p>
                        )}
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                          }`}
                        >
                          {msg.message}
                        </div>
                        <p className={`text-[10px] text-slate-400 mt-1 px-1 ${isOwn ? 'text-right' : ''}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          {!showUserList && (
            <div className="p-3 border-t border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedUser ? `Message ${selectedUser.full_name}...` : 'Message everyone...'}
                  className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
