'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import io, { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Chat from '@/components/Chat';

interface User {
    _id: string;
    name: string;
    email: string;
    partnerLinkCode: string;
    partnerId?: string;
    currentMood?: string;
    taskIntensity?: number;
    moodPrivacy?: boolean;
    onboardingData?: {
        communicationStyle: string;
    };
    nudge?: {
        active: boolean;
        sender: string;
        timestamp: string;
    };
}

interface PartnerStatus {
    connected: boolean;
    name?: string;
    mood?: string;
    intensity?: number;
    lastMoodUpdate?: string;
}

interface Stats {
    totalMemories: number;
    streak: number;
    avgRating: number;
}

interface Response {
    userId: { _id: string, name: string } | string;
    text: string;
    date: string;
}

interface Task {
    _id: string;
    title: string;
    description: string;
    category?: string;
    status: string;
    date?: string;
    responses?: Response[];
    feedback?: {
        userId: string;
        rating: number;
        comment: string;
    }[];
}

const MOODS = ['Happy', 'Stressed', 'Tired', 'Romantic', 'Chill'];
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000';

export default function Dashboard() {
    const router = useRouter();
    const socketRef = useRef<Socket | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
    const [partnerCode, setPartnerCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    // Core Data
    const [task, setTask] = useState<Task | null>(null);
    const [stats, setStats] = useState<Stats>({ totalMemories: 0, streak: 0, avgRating: 0 });
    const [history, setHistory] = useState<Task[]>([]);

    // UI States
    const [loadingTask, setLoadingTask] = useState(false);

    // Response State
    const [responseText, setResponseText] = useState('');
    const [submittingResponse, setSubmittingResponse] = useState(false);

    // Feedback State
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
    const [nudging, setNudging] = useState(false);
    const [hasNudged, setHasNudged] = useState(false);
    const [submittingMood, setSubmittingMood] = useState(false);

    // Preferences
    const [intensity, setIntensity] = useState(2);
    const [shareMood, setShareMood] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);

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
            if (!res.data.onboardingData || !res.data.onboardingData.communicationStyle) {
                router.push('/onboarding');
                return;
            }
            setUser(res.data);

            // Initialize UI controls
            if (res.data.taskIntensity) setIntensity(res.data.taskIntensity);
            // Default to true if undefined
            setShareMood(res.data.moodPrivacy !== undefined ? res.data.moodPrivacy : true);

            if (res.data.partnerId) {
                fetchDailyTask(res.data);
                fetchHistory(); // Fetch sidebar data
                fetchPartnerStatus(); // Fetch partner info
                fetchStats(); // Fetch engagement stats
            }
        } catch {
            localStorage.removeItem('token');
            router.push('/login');
        }
    };

    const fetchPartnerStatus = async () => {
        try {
            const res = await api.get('/partner/status');
            setPartnerStatus(res.data);
        } catch (err) {
            console.error("Failed to fetch partner status");
        }
    };

    const fetchDailyTask = async (currentUser: User) => {
        setLoadingTask(true);
        try {
            const res = await api.get('/tasks/daily');
            setTask(res.data);

            if (res.data.feedback && res.data.feedback.length > 0) {
                const myFeedback = res.data.feedback.find((f: any) =>
                    f.userId === currentUser._id || (f.userId._id && f.userId._id === currentUser._id)
                );
                if (myFeedback) setHasGivenFeedback(true);
            }
        } catch (err) {
            console.error("Failed to fetch task", err);
        }
        setLoadingTask(false);
    };

    const fetchTasks = async () => {
        if (user) {
            await fetchDailyTask(user);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/tasks/history');
            setHistory(res.data.slice(0, 5));
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/tasks/stats');
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    useEffect(() => {
        if (user?._id && user?.partnerId) {
            // Initialize Socket.io connection
            const socket = io(SOCKET_URL);
            socketRef.current = socket;

            const coupleRoom = [user._id, user.partnerId].sort().join('_');
            console.log('🔌 Joining couple room:', coupleRoom);
            socket.emit('join_couple_room', coupleRoom);

            // Emit user online event
            socket.emit('user_online', {
                userId: user._id,
                coupleId: user.partnerId
            });

            // Listen for partner response submissions
            socket.on('partner_responded', (data) => {
                console.log('Partner responded:', data);
                if (task?._id === data.taskId) {
                    setTask(prev => prev ? { ...prev, responses: data.responses } : null);
                }
                fetchTasks(); // Refresh tasks list
                // Show notification
                const audio = new Audio();
                audio.play().catch(() => { }); // Mute if autoplay blocked
            });

            // Listen for partner feedback submissions
            socket.on('partner_feedback', (data) => {
                console.log('Partner submitted feedback:', data);
                if (task?._id === data.taskId) {
                    setTask(prev => prev ? { ...prev, feedback: data.feedback } : null);
                }
                fetchStats(); // Update stats
                fetchTasks(); // Refresh tasks
            });

            // Listen for mood updates
            socket.on('partner_mood_updated', (data) => {
                console.log('🔄 Partner mood updated:', data);
                console.log('🔄 Current partnerStatus before update:', partnerStatus);
                setPartnerStatus(prev => {
                    const newStatus = prev ? {
                        ...prev,
                        mood: data.mood, // Already privacy-filtered by server
                        intensity: data.intensity, // Already privacy-filtered by server
                        lastMoodUpdate: data.timestamp
                    } : null;
                    console.log('🔄 Updated partnerStatus:', newStatus);
                    return newStatus;
                });
            });

            // Listen for task completion
            socket.on('task_completed', (data) => {
                console.log('Task marked complete:', data);
                fetchHistory(); // Refresh history/stats
                fetchTasks(); // Refresh tasks
            });

            // Listen for new task generated (if partner triggered it with settings change)
            socket.on('new_task_generated', (data) => {
                console.log('New task generated:', data);
                setTask(data.task);
                setHasGivenFeedback(false);
                setRating(0);
                setComment('');
                fetchTasks(); // Refresh tasks list
            });

            // Listen for task status updates
            socket.on('task_status_update', (data) => {
                console.log('Task status updated:', data);
                fetchTasks(); // Refresh tasks to show updated status
            });

            // Listen for feedback updates
            socket.on('feedback_update', (data) => {
                console.log('Feedback updated:', data);
                fetchTasks(); // Refresh tasks to show feedback
            });

            // Listen for partner online/offline status
            socket.on('partner_online', (data) => {
                console.log('Partner came online:', data);
                setPartnerStatus(prev => prev ? { ...prev, connected: true } : null);
            });

            socket.on('partner_offline', (data) => {
                console.log('Partner went offline:', data);
                setPartnerStatus(prev => prev ? { ...prev, connected: false } : null);
            });

            // Listen for dashboard updates
            socket.on('dashboard_update', (data) => {
                console.log('Dashboard update received:', data);
                fetchTasks(); // Refresh the current task
            });

            // Listen for task generation triggers
            socket.on('trigger_task_generation', () => {
                console.log('Task generation triggered');
                fetchTasks(); // Refresh to get new tasks
            });

            return () => {
                socket.disconnect();
            };
        }
    }, [user?._id, user?.partnerId, task?._id]);

    // Separate polling effect for nudges (less frequent)
    useEffect(() => {
        if (user?._id) {
            // Poll for nudges every 3 seconds
            const interval = setInterval(async () => {
                try {
                    const res = await api.get('/auth/user');
                    if (res.data.nudge?.active !== user.nudge?.active) {
                        setUser(res.data);
                        if (res.data.nudge?.active && !user.nudge?.active) {
                            confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.2 },
                                colors: ['#ec4899', '#8b5cf6']
                            });
                        }
                    }
                } catch (e) { }
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [user?._id, user?.nudge?.active]);

    // Auto-refresh data when partner is online
    useEffect(() => {
        if (!partnerStatus?.connected) return;

        const refreshInterval = setInterval(() => {
            fetchTasks();
            fetchStats();
            fetchPartnerStatus();
        }, 30000); // Refresh every 30 seconds when partner is online

        return () => clearInterval(refreshInterval);
    }, [partnerStatus?.connected]);

    const handleMoodSubmit = async (mood: string) => {
        setSubmittingMood(true);
        try {
            await api.put('/auth/mood', { mood, intensity, privacy: shareMood });
            setUser(prev => prev ? { ...prev, currentMood: mood } : null);
            // Refresh partner status to ensure sync? Actually partner status is THEIRS.
        } catch (err) {
            console.error("Failed to update mood", err);
        }
        setSubmittingMood(false);
    };

    const handleIntensitySubmit = async (val: number) => {
        setIntensity(val);
        // Optimistic UI update already handled by setIntensity
        try {
            // Need to send current mood and privacy otherwise backend might ignore or reset? 
            // Checking backend: if (mood) ... if (intensity) ... 
            // It allows partial updates but let's be safe and send current state values
            await api.put('/auth/mood', {
                mood: user?.currentMood || '',
                intensity: val,
                privacy: shareMood
            });
            // Update local user object to kept it in sync
            setUser(prev => prev ? { ...prev, taskIntensity: val } : null);
        } catch (err) {
            console.error("Failed to update intensity", err);
            // Revert on error?
        }
    };

    const togglePrivacy = async (checked: boolean) => {
        setShareMood(checked);
        if (user && user.currentMood) {
            try {
                // Update backend immediately so partner sees change
                await api.put('/auth/mood', { mood: user.currentMood, intensity, privacy: checked });
            } catch (err) {
                console.error(err);
            }
        }
    };

    const copyCode = () => {
        if (user) {
            navigator.clipboard.writeText(user.partnerLinkCode);
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const res = await api.post('/partner/connect', { partnerCode });
            setSuccess(`Connected with ${res.data.partnerName}!`);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            const userRes = await api.get('/auth/user');
            setUser(userRes.data);
            fetchDailyTask(userRes.data);
            fetchPartnerStatus();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Connection failed');
        }
    };

    // New Interactive Flow
    const submitResponse = async () => {
        if (!task || !responseText.trim()) return;
        setSubmittingResponse(true);
        try {
            const res = await api.post(`/tasks/${task._id}/respond`, { text: responseText });
            setTask(res.data); // Update task with new response/status
            setResponseText('');

            if (res.data.status === 'completed') {
                confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.6 },
                    colors: ['#e11d48', '#4f46e5', '#ffffff']
                });
                fetchHistory(); // Update sidebar
            }
        } catch (err) {
            console.error("Failed to submit response", err);
        }
        setSubmittingResponse(false);
    };

    const submitFeedback = async () => {
        if (!task || rating === 0) return;
        setSubmittingFeedback(true);
        try {
            await api.post(`/tasks/${task._id}/feedback`, { rating, comment });
            setHasGivenFeedback(true);
            fetchStats();
            fetchHistory();
        } catch (err) {
            console.error("Failed to submit feedback", err);
        }
        setSubmittingFeedback(false);
    };

    const handleNudge = async () => {
        setNudging(true);
        try {
            await api.post('/partner/nudge');
            setHasNudged(true);
            confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 },
                colors: ['#a855f7', '#ec4899']
            });
        } catch (err: any) {
            console.error("Nudge failed", err);
            // Optional: setError(err.response?.data?.msg || 'Failed to nudge');
        }
        setNudging(false);
    };

    const dismissNudge = async () => {
        try {
            await api.post('/partner/nudge/dismiss');
            setUser(prev => prev ? { ...prev, nudge: { ...prev.nudge!, active: false } } : null);
        } catch (err) {
            console.error("Dismiss failed", err);
        }
    };

    // Helper to check if I have responded
    const myResponse = task?.responses?.find(r => {
        const rId = typeof r.userId === 'string' ? r.userId : r.userId._id;
        return rId === user?._id;
    });

    if (!user) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse text-2xl font-bold text-rose-500">Loading Vibe... ❤️</div>
        </div>
    );

    return (
        <div className="min-h-screen transition-colors duration-500 bg-gray-50/30">
            {/* TOP NAVIGATION BAR */}
            <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-white/50 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    <span className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-600">
                        VibeSync
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 mr-4 text-sm font-medium text-gray-600">
                        <span>Welcome, {user.name}</span>
                    </div>
                    <Link href="/history" className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-full font-bold transition-colors text-sm">
                        <span>📜</span>
                        <span className="hidden md:inline">Timeline</span>
                    </Link>
                    <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="flex items-center gap-2 bg-pink-50 hover:bg-pink-100 text-pink-600 px-4 py-2 rounded-full font-bold transition-colors text-sm"
                    >
                        <span>💬</span>
                        <span className="hidden md:inline">Chat</span>
                    </button>
                    <button
                        onClick={() => { localStorage.removeItem('token'); router.push('/login') }}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-500 px-4 py-2 rounded-full font-bold transition-colors text-sm"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN - MAIN (2/3 width) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        {/* NUDGE NOTIFICATION */}
                        <AnimatePresence>
                            {user?.nudge?.active && (
                                <motion.div
                                    initial={{ opacity: 0, y: -50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -50 }}
                                    className="fixed top-4 right-4 z-50 bg-white border-l-4 border-rose-500 shadow-2xl rounded-xl p-4 max-w-sm flex items-start gap-4"
                                >
                                    <div className="bg-rose-100 p-2 rounded-full text-rose-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Hey! {user.nudge.sender} is waiting 💖</h4>
                                        <p className="text-sm text-gray-600 mt-1">They finished the daily vibe check. Your turn!</p>
                                        <button
                                            onClick={dismissNudge}
                                            className="mt-3 text-xs font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* DASHBOARD HEADER */}
                        <div className="glass-card p-6 rounded-3xl shadow-lg border-white/50">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <span className="bg-rose-100 p-1 rounded-md text-rose-500">🎭</span>
                                Current Vibe Check
                            </h2>

                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <div className="flex-1">
                                    <p className="text-gray-600 text-sm mb-1">How are you feeling?</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {MOODS.map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => handleMoodSubmit(m)}
                                                disabled={submittingMood}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full border transition-all font-semibold text-xs shadow-sm",
                                                    user.currentMood === m
                                                        ? 'bg-rose-500 text-white border-rose-500 shadow-rose-200'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300'
                                                )}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 border-l pl-6 border-gray-100">
                                    <div className="flex flex-col items-center relative group">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 cursor-help border-b border-dashed border-gray-300">Intensity</span>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-center z-50 pointer-events-none shadow-lg">
                                            Controls the depth of your daily questions (Chill vs Deep)
                                            <div className="absolute top-100 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800"></div>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                                            {[1, 2, 3].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => handleIntensitySubmit(val)}
                                                    className={cn(
                                                        "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all",
                                                        intensity === val ? "bg-indigo-500 text-white shadow-md" : "text-gray-400 hover:text-gray-600"
                                                    )}
                                                >
                                                    {val === 1 ? '☕' : val === 2 ? '⚖️' : '🔥'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center" title="Allow partner to see your mood">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Share Mood</span>
                                        <button
                                            type="button"
                                            onClick={() => togglePrivacy(!shareMood)}
                                            style={{
                                                backgroundColor: shareMood ? '#22c55e' : '#d1d5db',
                                                transition: 'background-color 0.2s ease-in-out'
                                            }}
                                            className="relative inline-flex h-7 w-12 cursor-pointer rounded-full p-0.5 focus:outline-none"
                                        >
                                            <span
                                                style={{
                                                    transform: shareMood ? 'translateX(20px)' : 'translateX(0px)',
                                                    transition: 'transform 0.2s ease-in-out'
                                                }}
                                                className="inline-block h-6 w-6 rounded-full bg-white shadow-md"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TODAY'S TASK CARD */}
                        {user.partnerId ? (
                            <motion.div
                                whileHover={{ scale: 1.002 }}
                                className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden min-h-[450px] flex flex-col justify-center"
                            >
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -mt-20 -mr-20"></div>
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/20 rounded-full blur-[80px] -mb-10 -ml-10"></div>

                                <div className="relative z-10 w-full">
                                    <div className="flex items-center gap-3 mb-6 opacity-80">
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                            {task?.category || 'Daily Vibe'}
                                        </span>
                                        <span className="h-1 w-1 bg-white rounded-full"></span>
                                        <span className="text-xs font-medium">Suggestion for Today</span>
                                    </div>

                                    {loadingTask ? (
                                        <div className="animate-pulse space-y-6">
                                            <div className="h-10 bg-white/20 rounded-lg w-3/4"></div>
                                            <div className="h-4 bg-white/20 rounded w-full"></div>
                                            <div className="h-4 bg-white/20 rounded w-2/3"></div>
                                        </div>
                                    ) : task ? (
                                        <div className="space-y-8">
                                            <div>
                                                <h3 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">{task.title}</h3>
                                                <p className="text-indigo-100 text-xl font-light leading-relaxed max-w-2xl">{task.description}</p>
                                            </div>

                                            {/* INTERACTIVE COMPONENT - THE PIVOT */}
                                            {task.status === 'completed' ? (
                                                <motion.div
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10"
                                                >
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <div className="bg-green-500/20 text-green-300 p-1 px-2 rounded-lg text-sm font-bold border border-green-500/30">
                                                            ✓ Completed
                                                        </div>
                                                        <p className="text-sm font-bold opacity-70">Responses Revealed!</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                        {task.responses?.map((r, i) => (
                                                            <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/20">
                                                                <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">
                                                                    {typeof r.userId === 'object' ? r.userId.name : 'Partner'}
                                                                </p>
                                                                <p className="text-lg font-medium">{r.text}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {!hasGivenFeedback ? (
                                                        <div className="space-y-4 border-t border-white/10 pt-4">
                                                            <p className="font-medium text-white/90">How was this connection?</p>
                                                            <div className="flex gap-3">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <button
                                                                        key={star}
                                                                        onClick={() => setRating(star)}
                                                                        className={`text-3xl transition-transform hover:scale-125 focus:outline-none ${rating >= star ? 'scale-110 grayscale-0' : 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                                                                    >
                                                                        ❤️
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {rating > 0 && (
                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="w-full space-y-3">
                                                                    <input
                                                                        type="text"
                                                                        value={comment}
                                                                        onChange={(e) => setComment(e.target.value)}
                                                                        placeholder="Add a quick note (optional but helps us personalize!)"
                                                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 text-sm outline-none focus:border-white/40 transition-colors"
                                                                    />
                                                                    <button
                                                                        onClick={submitFeedback}
                                                                        disabled={submittingFeedback}
                                                                        className="bg-white text-indigo-900 px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg"
                                                                    >
                                                                        {submittingFeedback ? 'Saving...' : 'Save Feedback'}
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm opacity-70">Feedback saved. See you tomorrow!</p>
                                                    )}
                                                </motion.div>
                                            ) : myResponse ? (
                                                <div className="pt-4">
                                                    <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-center space-y-4">
                                                        <div className="text-4xl animate-pulse">🔒</div>
                                                        <h3 className="text-xl font-bold">Response Locked</h3>
                                                        <p className="text-indigo-200">Waiting for your partner to add their vibe...</p>

                                                        {!hasNudged ? (
                                                            <button
                                                                onClick={handleNudge}
                                                                disabled={nudging}
                                                                className="mt-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-100 border border-indigo-500/30 px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 mx-auto"
                                                            >
                                                                {nudging ? (
                                                                    <span className="animate-spin">⌛</span>
                                                                ) : (
                                                                    <span>👋</span>
                                                                )}
                                                                {nudging ? 'Sending...' : 'Nudge Partner'}
                                                            </button>
                                                        ) : (
                                                            <div className="mt-2 text-indigo-300 text-sm font-medium bg-indigo-500/10 px-3 py-1 rounded-full inline-block">
                                                                ✨ Nudge sent!
                                                            </div>
                                                        )}
                                                        <div className="text-sm bg-white/10 inline-block px-3 py-1 rounded-full">
                                                            You said: <span className="italic">"{myResponse.text}"</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                                                    <label className="text-sm font-bold uppercase tracking-wider block opacity-70">Your Response</label>
                                                    <textarea
                                                        value={responseText}
                                                        onChange={(e) => setResponseText(e.target.value)}
                                                        placeholder="Type your answer here to unlock..."
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:bg-white/10 outline-none text-lg min-h-[100px] resize-none transition-colors"
                                                    />
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={submitResponse}
                                                            disabled={submittingResponse || !responseText.trim()}
                                                            className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold text-lg hover:shadow-lg hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {submittingResponse ? 'Sending...' : 'Send & Lock 🔒'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    ) : (
                                        <p className="text-lg italic text-white/70">Dreaming up a new task...</p>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="glass-card p-10 rounded-3xl shadow-lg border-white/60 bg-white/40 text-center py-24 flex flex-col items-center justify-center h-full">
                                <div className="bg-indigo-100 p-4 rounded-full mb-6">
                                    <span className="text-4xl">🔗</span>
                                </div>
                                <h2 className="text-3xl font-bold mb-4 text-gray-800">Connect Partner</h2>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                                    To unlock the full Vibe experience, you need a partner in crime.
                                </p>

                                <form onSubmit={handleConnect} className="w-full max-w-md space-y-4">
                                    <div>
                                        <label className="block text-left text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Enter Their Code</label>
                                        <input
                                            type="text"
                                            value={partnerCode}
                                            onChange={(e) => setPartnerCode(e.target.value)}
                                            className="block w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 bg-white text-center font-mono text-xl tracking-wider transition-all outline-none"
                                            placeholder="XXXXXX"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-1"
                                    >
                                        Link Account
                                    </button>
                                </form>
                                {error && <p className="text-red-500 text-sm mt-4 font-semibold bg-red-50 p-3 rounded-xl w-full max-w-md">{error}</p>}
                            </div>
                        )}
                    </motion.div>

                    {/* RIGHT COLUMN - SIDEBAR (1/3 width) */}
                    <div className="space-y-6">
                        {/* RELATIONSHIP PROFILE CARD */}
                        <div className="glass-card p-6 rounded-3xl shadow-lg border-white/60 bg-white/70">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Your Profile</h3>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-rose-400 to-indigo-400 flex items-center justify-center text-white font-bold text-xl">
                                    {user.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{user.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono border border-gray-200 select-all">{user.partnerLinkCode}</span>
                                        <button onClick={copyCode} className="text-xs text-indigo-600 font-bold hover:underline">
                                            {copySuccess || 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Status</h3>
                            {user.partnerId ? (
                                <div className="bg-green-50 text-green-700 p-4 rounded-2xl flex items-center gap-3 border border-green-100 mb-4">
                                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <div>
                                        <p className="font-bold text-sm">Synced: Daily Vibe Shared</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl flex items-center gap-3 border border-amber-100 mb-4">
                                    <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                                    <div>
                                        <p className="font-bold text-sm">Pending Connection</p>
                                        <p className="text-xs opacity-80">Share your code above</p>
                                    </div>
                                </div>
                            )}

                            {/* PARTNER STATUS - ENHANCED */}
                            {user.partnerId && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partner's Vibe</h3>
                                        <div className="flex items-center gap-1">
                                            <span className="relative flex h-2 w-2">
                                                {partnerStatus?.connected ? (
                                                    <>
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </>
                                                ) : (
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                                                )}
                                            </span>
                                            <span className={`text-[10px] font-medium ${partnerStatus?.connected ? 'text-green-600' : 'text-gray-500'}`}>
                                                {partnerStatus?.connected ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>

                                    {partnerStatus?.connected ? (
                                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                            {partnerStatus.mood ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">✨</span>
                                                    <div>
                                                        <p className="font-bold text-indigo-700 text-sm">{partnerStatus.name} is feeling</p>
                                                        <p className="text-lg font-extrabold text-indigo-900">{partnerStatus.mood}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 opacity-60">
                                                    <span className="text-xl">🙈</span>
                                                    <p className="text-xs text-gray-500 italic">{partnerStatus.name || 'Partner'} has hidden their mood.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 opacity-60">
                                                <span className="text-xl">💤</span>
                                                <p className="text-xs text-gray-500 italic">{partnerStatus?.name || 'Partner'} is currently offline.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ENGAGEMENT STATS */}
                            {user.partnerId && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Journey</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-3 rounded-xl text-center border border-orange-100">
                                            <span className="text-2xl font-extrabold text-orange-600">{stats.streak}</span>
                                            <p className="text-[10px] font-bold text-orange-500 uppercase">🔥 Streak</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-3 rounded-xl text-center border border-indigo-100">
                                            <span className="text-2xl font-extrabold text-indigo-600">{stats.totalMemories}</span>
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase">💜 Memories</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-3 rounded-xl text-center border border-rose-100">
                                            <span className="text-2xl font-extrabold text-rose-600">{stats.avgRating || '-'}</span>
                                            <p className="text-[10px] font-bold text-rose-500 uppercase">❤️ Avg</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="text-[10px] text-center text-gray-300 font-mono mt-4">VibeSync v1.0 • Built with ❤️</div>
                        </div>

                        {/* SIDEBAR TIMELINE */}
                        <div className="glass-card p-6 rounded-3xl shadow-lg border-white/60 bg-white/60 min-h-[300px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-gray-700">Recent Memories</h3>
                                <Link href="/history" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg">View All</Link>
                            </div>

                            {history.length > 0 ? (
                                <div className="space-y-6 relative ml-2">
                                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200 rounded-full"></div>
                                    {history.map((h, i) => (
                                        <div key={h._id} className="relative pl-6 group cursor-default">
                                            <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2 border-indigo-300 group-hover:bg-indigo-500 transition-colors z-10"></div>
                                            <p className="text-[10px] text-gray-400 font-mono mb-0.5 uppercase tracking-wide">{h.date ? new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'}</p>
                                            <h4 className="font-bold text-gray-700 text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{h.title}</h4>
                                            {h.category && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1.5 inline-block border border-gray-200">{h.category}</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 opacity-60 flex flex-col items-center">
                                    <div className="bg-gray-100 p-3 rounded-full mb-3">
                                        <span className="text-xl">🕰️</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">No memories yet</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[150px]">Complete your first task to start your timeline</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            <Chat
                user={user}
                connected={!!user.partnerId}
                isOpen={isChatOpen}
                onToggle={setIsChatOpen}
            />

        </div>
    );
}
