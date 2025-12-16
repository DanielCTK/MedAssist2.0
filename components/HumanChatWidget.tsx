
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, ChevronLeft, Loader2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as FirebaseUser } from 'firebase/auth';
import { ChatUser, ChatMessage, ChatSession } from '../types';
import { subscribeToUsers, subscribeToMessages, sendMessage, getChatId, markChatAsRead } from '../services/chatService';

interface HumanChatWidgetProps {
    currentUser: FirebaseUser | null;
    isDarkMode: boolean;
    activeChats: ChatSession[];
}

const HumanChatWidget: React.FC<HumanChatWidgetProps> = ({ currentUser, isDarkMode, activeChats }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMsg, setInputMsg] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch users when widget opens
    useEffect(() => {
        if (isOpen && currentUser) {
            setLoadingUsers(true);
            const unsub = subscribeToUsers(currentUser.uid, (users) => {
                setChatUsers(users);
                setLoadingUsers(false);
            });
            return () => unsub();
        }
    }, [isOpen, currentUser]);

    // Fetch messages when a user is selected
    useEffect(() => {
        if (currentUser && selectedUser) {
            const chatId = getChatId(currentUser.uid, selectedUser.uid);
            const unsub = subscribeToMessages(chatId, (msgs) => setMessages(msgs));
            markChatAsRead(chatId);
            return () => unsub();
        }
    }, [currentUser, selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedUser, isOpen]);

    const handleSendMessage = async () => {
        if (!inputMsg.trim() || !currentUser || !selectedUser) return;
        const msg = inputMsg;
        setInputMsg("");
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        await sendMessage(chatId, currentUser.uid, msg);
    };

    const hasUnread = (otherUserId: string) => {
        if (!currentUser) return false;
        const chatId = getChatId(currentUser.uid, otherUserId);
        const session = activeChats.find(c => c.id === chatId);
        return session?.lastMessage && !session.lastMessage.seen && session.lastMessage.senderId !== currentUser.uid;
    };

    const totalUnread = activeChats.filter(c => 
        c.lastMessage && !c.lastMessage.seen && c.lastMessage.senderId !== currentUser?.uid
    ).length;

    return (
        <>
            {/* Floating Trigger Button (Right side, stacked above AI and Inventory) */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-52 right-4 md:bottom-6 md:right-44 z-[60] p-3 md:p-4 rounded-full shadow-2xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white flex items-center justify-center transition-all ${isOpen ? 'hidden' : 'flex'}`}
            >
                <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-pulse"></div>
                <MessageCircle size={24} fill="currentColor" />
                {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {totalUnread}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Mobile Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/80 z-[65] backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            className={`
                                fixed z-[70] flex flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-hidden
                                md:bottom-24 md:right-44 md:w-[380px] md:h-[550px] md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-700
                                inset-0 md:inset-auto rounded-none h-full w-full
                            `}
                        >
                            {/* Header */}
                            <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 flex justify-between items-center text-white shrink-0 safe-top">
                                <div className="flex items-center gap-2">
                                    {selectedUser ? (
                                        <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-white/20 rounded-full"><ChevronLeft size={20}/></button>
                                    ) : (
                                        <MessageCircle size={20} />
                                    )}
                                    <h3 className="font-bold text-sm">
                                        {selectedUser ? selectedUser.displayName : "Messages"}
                                    </h3>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full">
                                    <Minimize2 size={18} className="md:hidden" />
                                    <X size={18} className="hidden md:block" />
                                </button>
                            </div>

                            {/* Content */}
                            {!selectedUser ? (
                                // USER LIST
                                <div className="flex-1 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
                                    {loadingUsers ? (
                                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-teal-500" /></div>
                                    ) : (
                                        <div className="space-y-1">
                                            {chatUsers.map(user => {
                                                const isUnread = hasUnread(user.uid);
                                                return (
                                                    <div 
                                                        key={user.uid} 
                                                        onClick={() => setSelectedUser(user)}
                                                        className={`flex items-center p-3 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${isUnread ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                                                    >
                                                        <div className="relative mr-3">
                                                            <img src={user.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-10 h-10 rounded-full object-cover" alt=""/>
                                                            {isUnread && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user.displayName}</h4>
                                                            <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {chatUsers.length === 0 && <p className="text-center text-xs text-slate-500 mt-10">No contacts found.</p>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // CHAT AREA
                                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/50">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {messages.map(msg => {
                                            const isMe = msg.senderId === currentUser?.uid;
                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] p-3 text-xs rounded-2xl ${
                                                        isMe 
                                                        ? 'bg-teal-600 text-white rounded-br-sm' 
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                                                    }`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 safe-bottom">
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-3 rounded-xl outline-none" 
                                                placeholder="Type message..." 
                                                value={inputMsg} 
                                                onChange={e => setInputMsg(e.target.value)} 
                                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            />
                                            <button onClick={handleSendMessage} className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700"><Send size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default HumanChatWidget;
