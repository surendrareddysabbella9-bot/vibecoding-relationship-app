'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
}

interface Task {
    _id: string;
    title: string;
    description: string;
    category?: string;
    status: string;
    date?: string;
    feedback?: {
        userId: string;
        rating: number;
        comment: string;
    }[];
}

const MOODS = ['Happy', 'Stressed', 'Tired', 'Romantic', 'Chill'];

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [partnerCode, setPartnerCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    // Core Data
    const [task, setTask] = useState<Task | null>(null);
    const [history, setHistory] = useState<Task[]>([]);

    // UI States
    const [loadingTask, setLoadingTask] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
    const [submittingMood, setSubmittingMood] = useState(false);

    // Preferences
    const [intensity, setIntensity] = useState(2);
    const [shareMood, setShareMood] = useState(true);

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
            if (res.data.moodPrivacy !== undefined) setShareMood(res.data.moodPrivacy);

            if (res.data.partnerId) {
                fetchDailyTask(res.data);
                fetchHistory(); // Fetch sidebar data
            }
        } catch {
            localStorage.removeItem('token');
            router.push('/login');
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

    const fetchHistory = async () => {
        try {
            const res = await api.get('/tasks/history');
            // Take only last 5 for sidebar
            setHistory(res.data.slice(0, 5));
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleMoodSubmit = async (mood: string) => {
        setSubmittingMood(true);
        try {
            await api.put('/auth/mood', { mood, intensity, privacy: shareMood });
            setUser(prev => prev ? { ...prev, currentMood: mood } : null);
        } catch (err) {
            console.error("Failed to update mood", err);
        }
        setSubmittingMood(false);
    };

    const copyCode = () => {
        if (user) {
            navigator.clipboard.writeText(user.partnerLinkCode);
            setCopySuccess('Code Copied!');
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
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Connection failed');
        }
    };

    const completeTask = async () => {
        if (!task) return;
        try {
            const res = await api.put(`/tasks/${task._id}/complete`);
            setTask(res.data);
            // Refresh history to show the new completed task immediately
            fetchHistory();
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#e11d48', '#4f46e5', '#ffffff']
            });
        } catch (err) {
            console.error("Failed to complete task", err);
        }
    };

    const submitFeedback = async () => {
        if (!task || rating === 0) return;
        setSubmittingFeedback(true);
        try {
            await api.post(`/tasks/${task._id}/feedback`, { rating, comment });
            setHasGivenFeedback(true);
        } catch (err) {
            console.error("Failed to submit feedback", err);
        }
        setSubmittingFeedback(false);
    };

    if (!user) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse text-2xl font-bold text-rose-500">Loading Vibe... ❤️</div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-8 transition-colors duration-500 bg-gray-50/30">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN - MAIN (2/3 width) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        {/* VIBE CHECK */}
                        <div className="glass-card p-6 rounded-3xl shadow-xl border-white/50">
                            <h2 className="text-2xl font-bold mb-4 gradient-text">✨ Vibe Check</h2>

                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <p className="text-gray-700 font-medium">How are you feeling right now?</p>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2" title="Share your mood with your partner?">
                                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Share</span>
                                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                                            <input
                                                type="checkbox"
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:bg-green-400 checked:border-green-400 checked:right-0 right-0 transition-all duration-200"
                                                checked={shareMood}
                                                onChange={(e) => setShareMood(e.target.checked)}
                                            />
                                            <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 bg-white/40 p-4 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Intensity</span>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                        {intensity === 1 ? 'Chill ☕' : intensity === 2 ? 'Balanced ⚖️' : 'Deep 🔥'}
                                    </span>
                                </div>
                                <input
                                    type="range" min="1" max="3" step="1"
                                    value={intensity}
                                    onChange={(e) => setIntensity(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>

                            <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                                {MOODS.map((m) => (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        key={m}
                                        onClick={() => handleMoodSubmit(m)}
                                        disabled={submittingMood}
                                        className={cn(
                                            "px-4 py-2 rounded-full border-2 transition-all font-semibold shadow-sm text-sm",
                                            user.currentMood === m
                                                ? 'bg-rose-500 text-white border-rose-500 shadow-rose-200'
                                                : 'bg-white/80 text-gray-700 border-white hover:bg-white hover:shadow-md'
                                        )}
                                    >
                                        {m}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* WELCOME HEADER */}
                        <header className="glass-card p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center bg-white/60 gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Welcome, {user.name}</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-gray-600 font-medium text-sm">Code: <span className="font-mono font-bold bg-white px-2 py-1 rounded-md border border-gray-200 text-indigo-600 select-all">{user.partnerLinkCode}</span></p>
                                    <button onClick={copyCode} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 font-bold">
                                        {copySuccess || 'Copy'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Link href="/history" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                                    View Full Timeline
                                </Link>
                            </div>
                        </header>

                        {/* TODAY'S TASK CARD */}
                        {user.partnerId ? (
                            <motion.div
                                whileHover={{ scale: 1.005 }}
                                className="bg-gradient-to-r from-rose-500 to-indigo-600 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden min-h-[400px] flex flex-col justify-center"
                            >
                                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>

                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 opacity-90">
                                    ❤️ Today's Vibe
                                    {task?.category && <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-mono uppercase tracking-wider">{task.category}</span>}
                                </h2>

                                {loadingTask ? (
                                    <div className="animate-pulse space-y-4">
                                        <div className="h-8 bg-white/30 rounded w-3/4"></div>
                                        <div className="h-4 bg-white/30 rounded w-full"></div>
                                        <div className="h-4 bg-white/30 rounded w-2/3"></div>
                                    </div>
                                ) : task ? (
                                    <div className="space-y-8 relative z-10">
                                        <h3 className="text-4xl md:text-5xl font-extrabold leading-tight">{task.title}</h3>
                                        <p className="text-white/90 text-xl font-light leading-relaxed">{task.description}</p>

                                        {task.status === 'completed' ? (
                                            <motion.div
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="mt-6 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20"
                                            >
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="bg-green-400 text-green-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">✅ Completed</span>
                                                </div>

                                                {!hasGivenFeedback ? (
                                                    <div className="space-y-4">
                                                        <p className="font-semibold text-lg">Rate this activity:</p>
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    onClick={() => setRating(star)}
                                                                    className={`text-3xl transition-transform hover:scale-110 focus:outline-none ${rating >= star ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}
                                                                >
                                                                    ⭐
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            value={comment}
                                                            onChange={(e) => setComment(e.target.value)}
                                                            placeholder="Any thoughts? (Optional)"
                                                            className="w-full text-gray-900 p-3 rounded-xl text-sm min-h-[80px] focus:ring-2 focus:ring-white/50 outline-none bg-white/90"
                                                        />
                                                        <button
                                                            onClick={submitFeedback}
                                                            disabled={rating === 0 || submittingFeedback}
                                                            className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold text-sm disabled:opacity-50 hover:bg-gray-100 transition-colors shadow-lg"
                                                        >
                                                            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-lg font-medium opacity-90 mt-2">Feedback received! We'll use it to improve future tasks. ✨</p>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={completeTask}
                                                className="bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-xl hover:shadow-xl transition-all shadow-md flex items-center gap-2 w-fit mx-auto md:mx-0"
                                            >
                                                Mark as Complete <span>✨</span>
                                            </motion.button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-lg italic">Generating your daily task...</p>
                                )}
                            </motion.div>
                        ) : (
                            <div className="glass-card p-10 rounded-3xl shadow-lg border-white/60 bg-white/40 text-center py-20">
                                <h2 className="text-2xl font-bold mb-4 text-gray-800">Ready to Connect?</h2>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto">Share your code with your partner or enter theirs below to start your Vibe Coding journey.</p>

                                <form onSubmit={handleConnect} className="flex flex-col md:flex-row gap-4 items-center justify-center">
                                    <div className="w-full max-w-xs">
                                        <input
                                            type="text"
                                            value={partnerCode}
                                            onChange={(e) => setPartnerCode(e.target.value)}
                                            className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-rose-500 focus:border-rose-500 bg-white/50 backdrop-blur-sm text-center font-mono text-lg"
                                            placeholder="Enter Code (e.g. 7f3a1b)"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/30 transition-all w-full md:w-auto"
                                    >
                                        Connect Partner
                                    </button>
                                </form>
                                {error && <p className="text-red-500 text-sm mt-4 font-semibold bg-red-50 p-2 rounded inline-block">{error}</p>}
                            </div>
                        )}
                    </motion.div>

                    {/* RIGHT COLUMN - SIDEBAR (1/3 width) - Hidden on mobile if needed, or stacked */}
                    <div className="space-y-6">
                        {/* RELATIONSHIP STATUS CARD */}
                        <div className="glass-card p-6 rounded-3xl shadow-lg border-white/60 bg-white/70">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Relationship Status</h3>
                            {user.partnerId ? (
                                <div className="bg-green-50 text-green-800 p-4 rounded-2xl flex items-center gap-3 border border-green-100">
                                    <span className="text-2xl">❤️</span>
                                    <div>
                                        <p className="font-bold text-sm">Connected</p>
                                        <p className="text-xs opacity-80">Sync active</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-100 text-gray-500 p-4 rounded-2xl flex items-center gap-3">
                                    <span className="text-2xl">🔌</span>
                                    <div>
                                        <p className="font-bold text-sm">Disconnected</p>
                                        <p className="text-xs opacity-80">Waiting for partner...</p>
                                    </div>
                                </div>
                            )}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <button onClick={() => { localStorage.removeItem('token'); router.push('/login') }} className="text-xs font-bold text-rose-500 hover:text-rose-700">
                                    Logout
                                </button>
                                <div className="text-xs text-gray-400">Vibe v1.0</div>
                            </div>
                        </div>

                        {/* SIDEBAR TIMELINE */}
                        <div className="glass-card p-6 rounded-3xl shadow-lg border-white/60 bg-white/60 min-h-[300px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Recent Memories</h3>
                                <Link href="/history" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View All</Link>
                            </div>

                            {history.length > 0 ? (
                                <div className="space-y-6 relative ml-2">
                                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                                    {history.map((h, i) => (
                                        <div key={h._id} className="relative pl-6">
                                            <div className="absolute left-[-5px] top-1.5 w-3 h-3 rounded-full bg-gradient-to-r from-rose-400 to-indigo-400 border-2 border-white shadow-sm"></div>
                                            <p className="text-xs text-gray-400 font-mono mb-1">{h.date ? new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently'}</p>
                                            <h4 className="font-bold text-gray-800 text-sm leading-tight">{h.title}</h4>
                                            {h.category && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mt-1 inline-block">{h.category}</span>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 opacity-60">
                                    <p className="text-3xl mb-2">📅</p>
                                    <p className="text-sm text-gray-500">No memories yet.</p>
                                    <p className="text-xs text-gray-400 mt-1">Complete tasks to build your timeline!</p>
                                </div>
                            )}
                        </div>

                        {/* PRO TIP CARD */}
                        <div className="bg-indigo-900 text-indigo-100 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <h3 className="font-bold mb-2 relative z-10">💡 Pro Tip</h3>
                            <p className="text-sm opacity-80 relative z-10">
                                The AI learns from your mood and feedback. Be honest for the best experience!
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
