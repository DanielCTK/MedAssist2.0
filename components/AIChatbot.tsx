import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// GoogleGenAI, Chat là đúng
import { GoogleGenAI, Chat } from "@google/genai";

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

// Lấy tên biến môi trường đã sửa lỗi
// ĐẢM BẢO FILE vite-env.d.ts CÓ KHAI BÁO TYPE CHO BIẾN NÀY
const GLOBAL_API_KEY = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY; 

const AIChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: "Hello Doctor. I am MedAssist AI. How can I help you with patient data or medical queries today?", sender: 'ai', timestamp: new Date() }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<Chat | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Initialize Chat Session
    useEffect(() => {
        // SỬA: Lấy từ biến GLOBAL_API_KEY đã được định nghĩa bên ngoài component
        const apiKey = GLOBAL_API_KEY;
        
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `You are MedAssist AI, a helpful virtual assistant for doctors. 
                        Keep answers concise, professional, and medically relevant. 
                        If asked about patients, remind the user you have limited access to real-time database for privacy, but can explain medical terms, drug interactions, or general procedures.`
                    }
                });
            } catch (e) {
                console.error("Failed to initialize AI chat", e);
            }
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            if (!chatSessionRef.current) {
                // SỬA: Lấy từ biến GLOBAL_API_KEY
                const apiKey = GLOBAL_API_KEY; 
                if (!apiKey) throw new Error("API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: `You are MedAssist AI, a helpful virtual assistant for doctors. 
                        Keep answers concise, professional, and medically relevant.`
                    }
                });
            }

            const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
            const aiText = response.text || "I'm sorry, I couldn't process that.";
            
            setMessages(prev => [...prev, { 
                id: (Date.now() + 1).toString(), 
                text: aiText, 
                sender: 'ai', 
                timestamp: new Date() 
            }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { 
                id: (Date.now() + 1).toString(), 
                text: "Connection error. Please try again.", 
                sender: 'ai', 
                timestamp: new Date() 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button - Positioned higher on mobile to avoid Bottom Nav */}
            {/* Mobile: bottom-20 (above nav), Desktop: bottom-6 */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] p-3 md:p-4 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center transition-all ${isOpen ? 'hidden' : 'flex'}`}
            >
                <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
                <MessageSquare size={24} fill="currentColor" />
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile focus */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/80 z-[65] backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            // Mobile: Inset-0 (Fullscreen) with bottom padding for safe area
                            // Desktop: Fixed size widget
                            className={`
                                fixed z-[70] flex flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-hidden
                                md:bottom-6 md:right-6 md:w-[400px] md:h-[550px] md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-700
                                inset-0 md:inset-auto rounded-none h-full w-full
                            `}
                        >
                            {/* Header */}
                            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center text-white shrink-0 safe-top">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <Bot size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold">MedAssist AI</h3>
                                        <div className="flex items-center space-x-1">
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                            <span className="text-[10px] opacity-80 uppercase tracking-wider">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <Minimize2 size={20} className="md:hidden" />
                                    <X size={18} className="hidden md:block" />
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50 custom-scrollbar">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm md:text-xs leading-relaxed ${
                                            msg.sender === 'user' 
                                            ? 'bg-blue-600 text-white rounded-br-none' 
                                            : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none shadow-sm'
                                        }`}>
                                            {msg.sender === 'ai' && <Sparkles size={12} className="text-blue-500 mb-1" />}
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-700">
                                            <Loader2 size={16} className="animate-spin text-blue-500" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 safe-bottom">
                                <form 
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex items-center space-x-2"
                                >
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask MedAssist..."
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm p-3.5 md:p-3 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!input.trim() || isLoading}
                                        className="p-3.5 md:p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                                    >
                                        <Send size={18} />
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIChatbot;