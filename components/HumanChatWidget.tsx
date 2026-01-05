
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle, X, Send, User, ChevronLeft, Loader2, Minimize2, Search, Bot, Sparkles, MoreVertical, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as FirebaseUser } from 'firebase/auth';
import { ChatUser, ChatMessage, ChatSession } from '../types';
import { subscribeToUsers, subscribeToMessages, sendMessage, getChatId, markChatAsRead, setTypingStatus, subscribeToChatMetadata } from '../services/chatService';
import { GoogleGenAI } from "@google/genai";

interface HumanChatWidgetProps {
    currentUser: FirebaseUser | null;
    isDarkMode: boolean;
    activeChats: ChatSession[];
}

// Helper to get API Key (Unified with Patient Dashboard)
const getGlobalApiKey = () => {
    const meta = import.meta as any;
    try {
        if (meta && meta.env && meta.env.VITE_GEMINI_API_KEY) {
            return meta.env.VITE_GEMINI_API_KEY;
        }
    } catch(e) {}
    
    // Fallback for Node/Legacy env
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        return process.env.API_KEY;
    }
    
    return null;
};

// --- TYPING ANIMATION COMPONENT ---
const TypingIndicator = ({ isDarkMode }: { isDarkMode: boolean }) => (
    <div className={`flex items-center space-x-1 p-3 rounded-2xl rounded-bl-sm w-16 h-10 ${isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-100 shadow-sm"}`}>
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? "bg-slate-400" : "bg-slate-500"}`}
                animate={{ y: [0, -5, 0] }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

const HumanChatWidget: React.FC<HumanChatWidgetProps> = ({ currentUser, isDarkMode, activeChats }) => {
    // --- STATE MANAGEMENT ---
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'human' | 'ai'>('human'); // NEW: Tabs
    
    // Human Chat States
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
    const [humanMessages, setHumanMessages] = useState<ChatMessage[]>([]);
    const [humanInput, setHumanInput] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [isOtherTyping, setIsOtherTyping] = useState(false);

    // Typing Timeout Ref
    const typingTimeoutRef = useRef<any>(null);

    // AI Chat States
    const [aiMessages, setAiMessages] = useState<{id: string, text: string, sender: 'user'|'ai', timestamp: Date}[]>([
        { id: 'welcome', text: "Xin chào! Tôi là Trợ lý Y tế ảo (AI). Tôi có thể giúp gì cho bạn về các thuật ngữ y khoa hoặc quy trình sơ cứu?", sender: 'ai', timestamp: new Date() }
    ]);
    const [aiInput, setAiInput] = useState("");
    const [isAiThinking, setIsAiThinking] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- EFFECTS ---

    // 1. Load Users (Human Mode)
    useEffect(() => {
        if (isOpen && currentUser && activeTab === 'human') {
            setLoadingUsers(true);
            const unsub = subscribeToUsers(currentUser.uid, (users) => {
                setChatUsers(users);
                setLoadingUsers(false);
            });
            return () => unsub();
        }
    }, [isOpen, currentUser, activeTab]);

    // 2. Load Messages & Typing Status (Human Mode)
    useEffect(() => {
        if (currentUser && selectedUser) {
            const chatId = getChatId(currentUser.uid, selectedUser.uid);
            
            // Subscribe Messages
            const unsubMsg = subscribeToMessages(chatId, (msgs) => {
                setHumanMessages(msgs);
            });

            // Subscribe Typing Status
            const unsubMeta = subscribeToChatMetadata(chatId, (session) => {
                if (session && session.typing) {
                    setIsOtherTyping(!!session.typing[selectedUser.uid]);
                } else {
                    setIsOtherTyping(false);
                }
            });

            markChatAsRead(chatId);
            
            return () => {
                unsubMsg();
                unsubMeta();
                setIsOtherTyping(false);
            };
        }
    }, [currentUser, selectedUser]);

    // 3. Auto Scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [humanMessages, aiMessages, selectedUser, isOpen, activeTab, isOtherTyping]);

    // --- LOGIC ---

    // Sort Users: Recent chats first
    const sortedUsers = useMemo(() => {
        if (!chatUsers || !activeChats) return [];
        return [...chatUsers].sort((a, b) => {
            const chatA = activeChats.find(c => c.participants.includes(a.uid));
            const chatB = activeChats.find(c => c.participants.includes(b.uid));
            const timeA = chatA?.lastMessage?.timestamp?.toMillis ? chatA.lastMessage.timestamp.toMillis() : 0;
            const timeB = chatB?.lastMessage?.timestamp?.toMillis ? chatB.lastMessage.timestamp.toMillis() : 0;
            return timeB - timeA;
        }).filter(u => u.displayName.toLowerCase().includes(userSearch.toLowerCase()));
    }, [chatUsers, activeChats, userSearch]);

    // Handle Human Input Change (Typing Logic)
    const handleHumanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHumanInput(e.target.value);
        if (!currentUser || !selectedUser) return;

        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        
        // Signal typing start
        setTypingStatus(chatId, currentUser.uid, true);

        // Debounce stop
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setTypingStatus(chatId, currentUser.uid, false);
        }, 2000);
    };

    // Send Human Message (Optimistic UI for Zero Delay)
    const handleSendHuman = async () => {
        if (!humanInput.trim() || !currentUser || !selectedUser) return;
        
        const text = humanInput;
        setHumanInput(""); // Clear input immediately
        
        // Clear typing status immediately
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        const chatId = getChatId(currentUser.uid, selectedUser.uid);
        // setTypingStatus called inside sendMessage, but doing it here locally cleans up logic
        
        // OPTIMISTIC UPDATE: Add to UI immediately before server confirms
        const optimisticMsg: ChatMessage = {
            id: `temp-${Date.now()}`,
            text: text,
            senderId: currentUser.uid,
            createdAt: { toMillis: () => Date.now() } // Fake Firestore timestamp
        };
        setHumanMessages(prev => [...prev, optimisticMsg]);

        try {
            await sendMessage(chatId, currentUser.uid, text);
            // Firestore subscription will eventually replace the optimistic msg with the real one
        } catch (e) {
            console.error("Send failed", e);
            // Optionally set error state on the message
        }
    };

    // Send AI Message
    const handleSendAI = async () => {
        if (!aiInput.trim()) return;
        
        const text = aiInput;
        setAiInput("");
        
        setAiMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user', timestamp: new Date() }]);
        setIsAiThinking(true);

        try {
            const apiKey = getGlobalApiKey();
            if (!apiKey) throw new Error("API_KEY_MISSING");
            
            const ai = new GoogleGenAI({ apiKey });
            // Corrected: Use ai.models.generateContent directly
            const response = await ai.models.generateContent({ 
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    systemInstruction: "Bạn là một trợ lý y tế ảo chuyên nghiệp, tận tâm và thân thiện. Hãy trả lời ngắn gọn, chính xác các câu hỏi về sức khỏe. Nếu là trường hợp khẩn cấp, hãy khuyên người dùng đến bệnh viện ngay."
                }
            });
            
            // Corrected: Access response.text property
            const responseText = response.text || "No response generated.";

            setAiMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: responseText, sender: 'ai', timestamp: new Date() }]);
        } catch (error: any) {
            let msg = "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại.";
            if (error.message === "API_KEY_MISSING") {
                msg = "Lỗi: Không tìm thấy API Key. Vui lòng kiểm tra cấu hình .env";
            }
            setAiMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: msg, sender: 'ai', timestamp: new Date() }]);
        } finally {
            setIsAiThinking(false);
        }
    };

    const hasUnread = (otherUserId: string) => {
        if (!currentUser) return false;
        const chatId = getChatId(currentUser.uid, otherUserId);
        const session = activeChats.find(c => c.id === chatId);
        return session?.lastMessage && !session.lastMessage.seen && session.lastMessage.senderId !== currentUser.uid;
    };

    const totalUnread = activeChats.filter(c => c.lastMessage && !c.lastMessage.seen && c.lastMessage.senderId !== currentUser?.uid).length;

    // --- STYLES ---
    const bgMain = isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200";
    const textMain = isDarkMode ? "text-white" : "text-slate-900";
    const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
    const bubbleUser = "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md";
    const bubbleOther = isDarkMode ? "bg-slate-800 text-slate-200 border border-slate-700" : "bg-white text-slate-800 border border-slate-100 shadow-sm";

    return (
        <>
            {/* Floating Trigger Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] p-4 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center transition-all ${isOpen ? 'hidden' : 'flex'}`}
            >
                <span className="absolute inset-0 rounded-full bg-white opacity-20 animate-ping"></span>
                <MessageCircle size={26} fill="currentColor" />
                {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {totalUnread}
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/60 z-[65] backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className={`
                                fixed z-[70] flex flex-col ${bgMain} shadow-2xl overflow-hidden
                                md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] md:rounded-3xl md:border
                                inset-0 md:inset-auto rounded-none h-full w-full font-sans
                            `}
                        >
                            {/* --- HEADER --- */}
                            <div className="bg-white dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-xl ${activeTab === 'human' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                            {activeTab === 'human' ? <MessageCircle size={20} /> : <Bot size={20} />}
                                        </div>
                                        <h3 className={`font-bold text-lg ${textMain}`}>
                                            {activeTab === 'human' ? (selectedUser ? selectedUser.displayName : "Tin nhắn") : "Trợ lý AI"}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                                            <Minimize2 size={18} />
                                        </button>
                                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-slate-500 hover:text-red-500 transition-colors md:hidden">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs Switcher */}
                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl relative">
                                    <motion.div 
                                        layoutId="tab-bg"
                                        className="absolute top-1 bottom-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        style={{ 
                                            left: activeTab === 'human' ? '4px' : '50%', 
                                            right: activeTab === 'human' ? '50%' : '4px',
                                            width: 'auto' 
                                        }}
                                    />
                                    <button 
                                        onClick={() => { setActiveTab('human'); setSelectedUser(null); }}
                                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider relative z-10 flex items-center justify-center gap-2 transition-colors ${activeTab === 'human' ? (isDarkMode ? 'text-white' : 'text-blue-600') : textSub}`}
                                    >
                                        <User size={14} /> Bác Sĩ / Chat
                                        {totalUnread > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{totalUnread}</span>}
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('ai')}
                                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider relative z-10 flex items-center justify-center gap-2 transition-colors ${activeTab === 'ai' ? (isDarkMode ? 'text-white' : 'text-purple-600') : textSub}`}
                                    >
                                        <Sparkles size={14} /> Tư Vấn AI
                                    </button>
                                </div>
                            </div>

                            {/* --- CONTENT AREA --- */}
                            <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-950/50">
                                
                                {/* 1. HUMAN: USER LIST */}
                                {activeTab === 'human' && !selectedUser && (
                                    <div className="absolute inset-0 flex flex-col">
                                        <div className="p-3">
                                            <div className={`flex items-center px-3 py-2.5 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} shadow-sm`}>
                                                <Search size={16} className={textSub}/>
                                                <input 
                                                    type="text" placeholder="Tìm người liên hệ..." 
                                                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                                    className={`bg-transparent outline-none text-sm ml-2 flex-1 ${textMain} placeholder-slate-400`}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                            {loadingUsers ? (
                                                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>
                                            ) : sortedUsers.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-40 opacity-50">
                                                    <User size={40} className="mb-2 text-slate-400" />
                                                    <p className="text-xs text-slate-500">Không tìm thấy liên hệ nào</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {sortedUsers.map(user => {
                                                        const isUnread = hasUnread(user.uid);
                                                        return (
                                                            <div key={user.uid} onClick={() => setSelectedUser(user)} className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all hover:bg-slate-200 dark:hover:bg-slate-800 group ${isUnread ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                                                <div className="relative mr-4">
                                                                    <img src={user.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform" alt=""/>
                                                                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white dark:border-slate-900 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                                        <h4 className={`text-sm font-bold truncate ${textMain}`}>{user.displayName}</h4>
                                                                        {user.isOnline && <span className="text-[9px] text-green-500 font-bold">Online</span>}
                                                                    </div>
                                                                    <p className={`text-xs truncate ${isUnread ? 'font-bold text-blue-600' : textSub}`}>
                                                                        {isUnread ? 'Tin nhắn mới' : user.role === 'doctor' ? 'Bác sĩ chuyên khoa' : 'Bệnh nhân'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 2. HUMAN: CHAT ROOM */}
                                {activeTab === 'human' && selectedUser && (
                                    <div className="absolute inset-0 flex flex-col">
                                        <div className="flex items-center px-4 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur border-b border-slate-100 dark:border-slate-800">
                                            <button onClick={() => setSelectedUser(null)} className="mr-2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><ChevronLeft size={20} className={textSub}/></button>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold ${textMain}`}>{selectedUser.displayName}</p>
                                                <p className="text-[10px] text-slate-500">{selectedUser.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                            {humanMessages.map((msg, idx) => {
                                                const isMe = msg.senderId === currentUser?.uid;
                                                const showAvatar = idx === 0 || humanMessages[idx-1].senderId !== msg.senderId;
                                                return (
                                                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        {!isMe && showAvatar && (
                                                            <img src={selectedUser.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-6 h-6 rounded-full mr-2 self-end mb-1" alt=""/>
                                                        )}
                                                        {!isMe && !showAvatar && <div className="w-8" />} {/* Spacer */}
                                                        
                                                        <div className={`max-w-[75%] p-3 text-sm rounded-2xl shadow-sm ${isMe ? `${bubbleUser} rounded-br-sm` : `${bubbleOther} rounded-bl-sm`}`}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* TYPING INDICATOR */}
                                            {isOtherTyping && (
                                                <div className="flex w-full justify-start">
                                                    <img src={selectedUser.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"} className="w-6 h-6 rounded-full mr-2 self-end mb-1" alt=""/>
                                                    <TypingIndicator isDarkMode={isDarkMode} />
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                            <form onSubmit={(e) => { e.preventDefault(); handleSendHuman(); }} className="flex gap-2 items-center">
                                                <button type="button" className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Paperclip size={18}/></button>
                                                <input 
                                                    className={`flex-1 bg-slate-100 dark:bg-slate-800 ${textMain} text-sm px-4 py-2.5 rounded-full outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`} 
                                                    placeholder="Nhập tin nhắn..." 
                                                    value={humanInput} 
                                                    onChange={handleHumanInputChange} 
                                                />
                                                <button type="submit" disabled={!humanInput.trim()} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md">
                                                    <Send size={18}/>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                                {/* 3. AI: CHAT ROOM */}
                                {activeTab === 'ai' && (
                                    <div className="absolute inset-0 flex flex-col bg-slate-50 dark:bg-slate-950">
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                            {aiMessages.map((msg, idx) => {
                                                const isAi = msg.sender === 'ai';
                                                return (
                                                    <div key={msg.id} className={`flex w-full ${!isAi ? 'justify-end' : 'justify-start'}`}>
                                                        {isAi && (
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white mr-2 self-start shadow-md">
                                                                <Sparkles size={14} />
                                                            </div>
                                                        )}
                                                        <div className={`max-w-[85%] p-3.5 text-sm rounded-2xl shadow-sm leading-relaxed ${!isAi ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm' : `${bubbleOther} rounded-tl-sm`}`}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {isAiThinking && (
                                                <div className="flex w-full justify-start">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white mr-2 self-center shadow-md">
                                                        <Sparkles size={14} />
                                                    </div>
                                                    <div className={`${bubbleOther} p-3 rounded-2xl rounded-tl-sm flex items-center gap-2`}>
                                                        <Loader2 size={16} className="animate-spin text-purple-500" />
                                                        <span className="text-xs text-slate-500">AI đang suy nghĩ...</span>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                            <form onSubmit={(e) => { e.preventDefault(); handleSendAI(); }} className="flex gap-2 items-center">
                                                <input 
                                                    className={`flex-1 bg-slate-100 dark:bg-slate-800 ${textMain} text-sm px-4 py-2.5 rounded-full outline-none focus:ring-2 focus:ring-purple-500/20 transition-all`} 
                                                    placeholder="Hỏi trợ lý AI..." 
                                                    value={aiInput} 
                                                    onChange={e => setAiInput(e.target.value)} 
                                                />
                                                <button type="submit" disabled={!aiInput.trim() || isAiThinking} className="p-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-md">
                                                    <Send size={18}/>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default HumanChatWidget;
