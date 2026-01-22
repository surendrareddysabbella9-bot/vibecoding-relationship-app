'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Send, MessageSquare, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Message {
    _id: string;
    text: string;
    sender: { _id: string, name: string } | string;
    timestamp: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function ChatPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [partnerOnline, setPartnerOnline] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch User
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchUser();
    }, [router]);

    const fetchUser = async () => {
        try {
            const res = await api.get('/auth/user');
            setUser(res.data);
            setConnected(!!res.data.partnerId);
        } catch {
            localStorage.removeItem('token');
            router.push('/login');
        }
    };

    const roomId = user?.partnerId ? [user._id, user.partnerId].sort().join('_') : null;

    useEffect(() => {
        if (!user || !roomId) return;

        console.log('🔌 Connecting to Socket:', SOCKET_URL);

        // Initialize Socket
        const newSocket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'], // Try polling first (often better for firewalls/proxies)
            withCredentials: true,
            reconnectionAttempts: 5
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ Socket Connection Error:', err.message);
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket Connected:', newSocket.id);
        });

        setSocket(newSocket);

        newSocket.emit('join_couple_room', roomId);

        // Emit user online event
        newSocket.emit('user_online', {
            userId: user._id,
            coupleId: user.partnerId
        });

        newSocket.on('receive_message', (data: any) => {
            setMessages((prev) => [...prev, data]);
            setIsTyping(false);
            scrollToBottom();

            // Play notification sound
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audioContext.state === 'suspended') audioContext.resume();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            } catch (error) { }
        });

        newSocket.on('typing', () => setIsTyping(true));
        newSocket.on('stop_typing', () => setIsTyping(false));
        newSocket.on('partner_online', () => setPartnerOnline(true));
        newSocket.on('partner_offline', () => setPartnerOnline(false));

        fetchHistory(roomId);

        return () => {
            newSocket.disconnect();
        };
    }, [user, roomId]);

    const fetchHistory = async (room: string) => {
        try {
            const res = await api.get(`/messages/${room}`);
            setMessages(res.data);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to load chat history");
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && socket && roomId) {
            const messageData = {
                room: roomId,
                senderId: user._id,
                author: user.name,
                message: currentMessage,
                time: new Date().toISOString(),
            };

            await socket.emit("send_message", messageData);
            socket.emit("stop_typing", { room: roomId });

            const localMsg: Message = {
                _id: Date.now().toString(),
                text: currentMessage,
                sender: { _id: user._id, name: user.name },
                timestamp: new Date().toISOString()
            };

            setMessages((list) => [...list, localMsg]);
            setCurrentMessage("");
            scrollToBottom();
        }
    };

    const handleTyping = () => {
        if (socket && roomId) {
            socket.emit("typing", { room: roomId });
        }
        if (typingTimeout) clearTimeout(typingTimeout);
        const timeout = setTimeout(() => handleStopTyping(), 3000);
        setTypingTimeout(timeout);
    };

    const handleStopTyping = () => {
        if (socket && roomId) {
            socket.emit("stop_typing", { room: roomId });
        }
    };

    if (!user) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="animate-spin text-4xl">💞</div></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Navbar */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50 border-b border-indigo-100 p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-semibold">Back to Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${partnerOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-600">
                            {partnerOnline ? 'Partner Online' : 'Partner Offline'}
                        </span>
                    </div>
                </div>
            </nav>

            <main className="flex-1 pt-20 pb-24 px-4 max-w-4xl mx-auto w-full flex flex-col">
                {!connected ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl shadow-sm border border-gray-100 mt-8">
                        <div className="bg-rose-100 w-24 h-24 rounded-full flex items-center justify-center mb-6 text-rose-500 shadow-sm animate-pulse">
                            <MessageSquare size={40} />
                        </div>
                        <h3 className="font-bold text-2xl text-gray-800 mb-2">Connect to Chat</h3>
                        <p className="text-gray-500 mb-8 leading-relaxed max-w-md">
                            Sync with your partner to unlock the private chat room!
                            <br />
                            <span className="text-xs font-medium text-indigo-500 mt-4 block bg-indigo-50 py-2 px-4 rounded-full inline-block">
                                Waiting for partner sync...
                            </span>
                        </p>
                        <Link href="/dashboard" className="bg-gray-900 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg active:scale-95">
                            Go to Dashboard
                        </Link>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-xl border border-gray-100 flex-1 flex flex-col overflow-hidden h-[calc(100dvh-140px)]"
                    >
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scrollbar-thin scrollbar-thumb-indigo-100">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 opacity-60">
                                    <MessageSquare size={48} className="mb-4 text-indigo-200" />
                                    <p className="font-medium">No messages yet</p>
                                    <p className="text-sm">Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = (typeof msg.sender === 'string' ? msg.sender : msg.sender._id) === user._id;
                                    return (
                                        <div key={index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[75%] md:max-w-[60%] p-4 rounded-3xl text-sm shadow-sm relative group transition-all hover:shadow-md ${isMe
                                                ? "bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-br-none"
                                                : "bg-white text-gray-700 border border-gray-100 rounded-bl-none"
                                                }`}>
                                                {!isMe && (
                                                    <p className="text-[10px] font-bold text-indigo-500 mb-1 opacity-70 uppercase tracking-wider">
                                                        {typeof msg.sender === 'object' ? msg.sender.name : 'Partner'}
                                                    </p>
                                                )}
                                                <p className="leading-relaxed text-[15px]">{msg.text}</p>
                                                <p className={`text-[10px] mt-2 ${isMe ? "text-indigo-200" : "text-gray-300"} text-right`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {isTyping && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm">
                                        <div className="flex space-x-1.5">
                                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <div className="flex gap-3 items-center bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-inner">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={(event) => {
                                        setCurrentMessage(event.target.value);
                                        handleTyping();
                                    }}
                                    onKeyPress={(event) => event.key === "Enter" && sendMessage()}
                                    onBlur={handleStopTyping}
                                    placeholder="Type your message..."
                                    className="flex-1 bg-transparent px-4 py-3 text-base outline-none placeholder-gray-400 text-gray-700"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!currentMessage.trim()}
                                    className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:scale-95 shadow-lg shadow-indigo-200 active:scale-90"
                                >
                                    <Send size={20} className="translate-x-0.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
