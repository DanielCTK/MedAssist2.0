
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, X, Send, User, ChevronLeft, Loader2, Minimize2, Search } from 'lucide-react';
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
    const [userSearch, setUserSearch] = useState("");

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

    // --- SORT USERS LOGIC: LATEST CHAT FIRST ---
    const sortedUsers = useMemo(() => {
        if (!chatUsers || !activeChats) return [];
        
        return [...chatUsers].sort((a, b) => {
            const chatA = activeChats.find(c => c.participants.includes(a.uid));
            const chatB = activeChats.find(c => c.participants.includes(b.uid));
            
            const timeA = chatA?.lastMessage?.timestamp?.toMillis ? chatA.lastMessage.timestamp.toMillis() : 0;
            const timeB = chatB?.lastMessage?.timestamp?.toMillis ? chatB.lastMessage.timestamp.toMillis() : 0;
            
            return timeB - timeA; // Descending (Newest first)
        }).filter(u => u.displayName.toLowerCase().includes(userSearch.toLowerCase()));
    }, [chatUsers, activeChats, userSearch]);

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

    // Styles
    const bgMain = isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
    const bgSecondary = isDarkMode ? "bg-slate-800" : "bg-slate-100";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";

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
                                fixed z-[70] flex flex-col ${bgMain} shadow-2xl overflow-hidden
                                md:bottom-24 md:right-44 md:w-[380px] md:h-[600px] md:rounded-3xl md:border
                                inset-0 md:inset-auto rounded-none h-full w-full
                            `}
                        >
                            {/* Header */}
                            <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 flex justify-between items-center text-white shrink-0 safe-top shadow-md z-10">
                                <div className="flex items-center gap-3">
                                    {selectedUser ? (
                                        <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-white/20 rounded-full"><ChevronLeft size={20}/></button>
                                    ) : (
                                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-md"><MessageCircle size={18} fill="currentColor"/></div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-sm">
                                            {selectedUser ? selectedUser.displayName : "Messages"}
                                        </h3>
                                        {selectedUser && <p className="text-[10px] opacity-80 font-medium tracking-wide">Online</p>}
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full">
                                    <Minimize2 size={18} className="md:hidden" />
                                    <X size={18} className="hidden md:block" />
                                </button>
                            </div>

                            {/* Content */}
                            {!selectedUser ? (
                                // USER LIST VIEW
                                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/50">
                                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                                        <div className={`flex items-center px-3 py-2 rounded-xl ${bgMain} border shadow-sm`}>
                                            <Search size={14} className={textSub}/>
                                            <input 
                                                type="text" 
                                                placeholder="Search contacts..." 
                                                value={userSearch}
                                                onChange={e => setUserSearch(e.target.value)}
                                                className={`bg-transparent outline-none text-xs ml-2 flex-1 ${textMain}`}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                        {loadingUsers ? (
                                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-teal-500" /></div>
                                        ) : (
                                            <div className="space-y-2">
                                                {sortedUsers.map(user => {
                                                    const isUnread = hasUnread(user.uid);
                                                    return (
                                                        <div 
                                                            key={user.uid} 
                                                            onClick={() => setSelectedUser(user)}
                                                            className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 border border-transparent ${isUnread ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                                        >
                                                            <div className="relative mr-4">
                                                                <img src={user.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-12 h-12 rounded-full object-cover shadow-sm" alt=""/>
                                                                {isUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-white">1</div>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <h4 className={`text-sm font-bold truncate ${textMain}`}>{user.displayName}</h4>
                                                                    <span className="text-[10px] text-slate-400">12:30</span>
                                                                </div>
                                                                <p className={`text-xs truncate ${isUnread ? 'font-bold text-teal-600 dark:text-teal-400' : textSub}`}>
                                                                    {isUnread ? 'New message received' : 'Tap to view conversation'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {sortedUsers.length === 0 && <p className="text-center text-xs text-slate-500 mt-10">No contacts found.</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // CHAT AREA
                                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/50">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {messages.map(msg => {
                                            const isMe = msg.senderId === currentUser?.uid;
                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] p-3 text-xs leading-relaxed shadow-sm ${
                                                        isMe 
                                                        ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl rounded-tr-sm' 
                                                        : `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${textMain} rounded-2xl rounded-tl-sm`
                                                    }`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <div className={`p-3 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} shrink-0 safe-bottom`}>
                                        <div className={`flex gap-2 items-center p-1 rounded-2xl border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                                            <input 
                                                className={`flex-1 bg-transparent ${textMain} text-xs p-3 outline-none`} 
                                                placeholder="Type a message..." 
                                                value={inputMsg} 
                                                onChange={e => setInputMsg(e.target.value)} 
                                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            />
                                            <button onClick={handleSendMessage} disabled={!inputMsg.trim()} className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50">
                                                <Send size={16}/>
                                            </button>
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
