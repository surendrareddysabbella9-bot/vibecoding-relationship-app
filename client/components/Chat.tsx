'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import io, { Socket } from 'socket.io-client';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, X, Minus } from 'lucide-react';

interface ChatProps {
    user: any;
    connected: boolean;
}

interface Message {
    _id: string;
    text: string;
    sender: { _id: string, name: string } | string;
    timestamp: string;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function Chat({ user, connected, isOpen, onToggle }: { user: any, connected: boolean, isOpen: boolean, onToggle: (open: boolean) => void }) {
    const [mounted, setMounted] = useState(false);
    // const [isOpen, setIsOpen] = useState(false); // Controlled by parent
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const [partnerOnline, setPartnerOnline] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const roomId = user.partnerId ? [user._id, user.partnerId].sort().join('_') : null;

    useEffect(() => {
        if (!connected || !roomId) return;

        // Initialize Socket
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.emit('join_couple_room', roomId);

        // Emit user online event
        newSocket.emit('user_online', {
            userId: user._id,
            coupleId: user.partnerId
        });

        newSocket.on('receive_message', (data: any) => {
            setMessages((prev) => [...prev, data]);
            setIsTyping(false); // Stop typing indicator when message received

            // Play notification sound using Web Audio API
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
            } catch (error) {
                // Silently fail if Web Audio API is not supported
            }
        });

        newSocket.on('typing', () => {
            setIsTyping(true);
        });

        newSocket.on('stop_typing', () => {
            setIsTyping(false);
        });

        newSocket.on('partner_online', (data) => {
            setPartnerOnline(true);
        });

        newSocket.on('partner_offline', (data) => {
            setPartnerOnline(false);
        });

        // Load history
        fetchHistory();

        return () => {
            newSocket.disconnect();
        };
    }, [connected, roomId]);

    const fetchHistory = async () => {
        if (!roomId) return;
        try {
            const res = await api.get(`/messages/${roomId}`);
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to load chat history");
        }
    };

    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);

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
                _id: Date.now().toString(), // temp ID
                text: currentMessage,
                sender: { _id: user._id, name: user.name },
                timestamp: new Date().toISOString()
            };

            setMessages((list) => [...list, localMsg]);
            setCurrentMessage("");
        }
    };

    const handleTyping = () => {
        if (socket && roomId) {
            socket.emit("typing", { room: roomId });
        }

        // Clear existing timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Set new timeout to stop typing after 3 seconds
        const timeout = setTimeout(() => {
            handleStopTyping();
        }, 3000);

        setTypingTimeout(timeout);
    };

    const handleStopTyping = () => {
        if (socket && roomId) {
            socket.emit("stop_typing", { room: roomId });
        }
    };



    // We will still render the Chat Window fixed at the bottom right.
    // But we will NOT render the trigger button if we are using the navbar one.
    // ...Wait, the user might still expect the floating button if they scroll down?
    // "add a icon of chat at the side of timeline button" usually implies REPLACING the floating access or ADDING to it.
    // Let's support the Navbar button controlling the visibility.

    if (!mounted) return null;

    // Floating Panel Animation Variants
    const panelVariants = {
        hidden: { opacity: 0, x: 50, scale: 0.95 },
        visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
        exit: { opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }
    };



    return createPortal(
        <div className="z-[9999]">
            <AnimatePresence mode="wait">
                {isOpen && (
                    <motion.div
                        className="fixed top-24 bottom-6 right-6 z-[9999] flex flex-col justify-end pointer-events-none"
                    >
                        <motion.div
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`w-full md:w-[400px] h-full pointer-events-auto flex flex-col relative overflow-hidden ring-1 ring-black/5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] ${!connected ? 'bg-white border-white/20' : 'bg-slate-50 border-white/40 backdrop-blur-md'}`}
                        >
                            {/* !CONNECTED STATE: PROMPT */}
                            {!connected && (
                                <>
                                    <button
                                        onClick={() => onToggle(false)}
                                        className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors z-10"
                                    >
                                        <X size={20} />
                                    </button>

                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-white to-slate-50">
                                        <div className="bg-gradient-to-tr from-rose-100 to-rose-50 w-24 h-24 rounded-full flex items-center justify-center mb-6 text-rose-500 shadow-sm shadow-rose-100">
                                            <MessageSquare size={40} />
                                        </div>
                                        <h3 className="font-bold text-2xl text-gray-800 mb-2">Private Connection</h3>
                                        <p className="text-gray-500 mb-8 leading-relaxed text-sm px-4">
                                            Link your accounts to unlock the specialized couple's chat room.
                                            <br />
                                            <span className="text-xs font-medium text-indigo-500 mt-4 block bg-indigo-50 py-2 px-4 rounded-full inline-block">
                                                Waiting for partner sync...
                                            </span>
                                        </p>
                                        <button
                                            onClick={() => onToggle(false)}
                                            className="bg-gray-900 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95"
                                        >
                                            Close Panel
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* CONNECTED STATE: CHAT */}
                            {connected && (
                                <>
                                    {/* Header */}
                                    <div className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center z-10 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${partnerOnline ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}>
                                                    <MessageSquare size={20} />
                                                </div>
                                                {partnerOnline && (
                                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">Our Vibe Room</h3>
                                                <p className={`text-xs font-medium ${partnerOnline ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                    {partnerOnline ? 'Partner is Online' : 'Partner is Offline'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onToggle(false)}
                                            className="p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                        {messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-3">
                                                <div className="bg-indigo-50 p-4 rounded-full">
                                                    <MessageSquare size={32} className="text-indigo-300" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700">No messages yet</p>
                                                    <p className="text-xs text-gray-400 max-w-[200px] mx-auto mt-1">Send a message to start your private conversation!</p>
                                                </div>
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => {
                                                const isMe = (typeof msg.sender === 'string' ? msg.sender : msg.sender._id) === user._id;
                                                return (
                                                    <div key={index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                        <div
                                                            className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm relative group ${isMe
                                                                ? "bg-indigo-600 text-white rounded-br-none"
                                                                : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                                                                }`}
                                                        >
                                                            {!isMe && (
                                                                <p className="text-[10px] font-bold text-indigo-500 mb-1 opacity-70 uppercase tracking-wider">
                                                                    {typeof msg.sender === 'object' ? msg.sender.name : 'Partner'}
                                                                </p>
                                                            )}
                                                            <p className="leading-relaxed">{msg.text}</p>
                                                            <p className={`text-[9px] mt-1 ${isMe ? "text-indigo-200" : "text-gray-400"} text-right`}>
                                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-4 shadow-sm">
                                                    <div className="flex space-x-1.5">
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-3 bg-white border-t border-gray-100 flex gap-2 shadow-sm z-10">
                                        <input
                                            type="text"
                                            value={currentMessage}
                                            onChange={(event) => {
                                                setCurrentMessage(event.target.value);
                                                handleTyping();
                                            }}
                                            onKeyPress={(event) => event.key === "Enter" && sendMessage()}
                                            onBlur={handleStopTyping}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all border border-gray-100 focus:border-indigo-300 placeholder-gray-400 text-gray-700"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={!currentMessage.trim()}
                                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-3 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95 duration-200 flex items-center justify-center aspect-square"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
}
