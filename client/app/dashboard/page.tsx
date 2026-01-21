'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
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

interface PartnerStatus {
    connected: boolean;
    name?: string;
    mood?: string;
    intensity?: number;
    lastMoodUpdate?: string;
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

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
    const [partnerCode, setPartnerCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    // Core Data
    const [task, setTask] = useState<Task | null>(null);
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
            // Default to true if undefined
            setShareMood(res.data.moodPrivacy !== undefined ? res.data.moodPrivacy : true);

            if (res.data.partnerId) {
                fetchDailyTask(res.data);
                fetchHistory(); // Fetch sidebar data
                fetchPartnerStatus(); // Fetch partner info
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

    const fetchHistory = async () => {
        try {
            const res = await api.get('/tasks/history');
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
            // Refresh partner status to ensure sync? Actually partner status is THEIRS.
        } catch (err) {
            console.error("Failed to update mood", err);
        }
        setSubmittingMood(false);
    };

    // Also update preference when toggle changes immediately
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
        } catch (err) {
            console.error("Failed to submit feedback", err);
        }
        setSubmittingFeedback(false);
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
                        {/* VIBE CHECK */}
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
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Intensity</span>
                                        <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                                            {[1, 2, 3].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => setIntensity(val)}
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
                                        <div className="relative inline-block w-10 align-middle select-none">
                                            <input
                                                type="checkbox"
                                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-2 appearance-none cursor-pointer border-gray-300 checked:bg-green-500 checked:border-green-500 checked:right-0 right-0 transition-all duration-200"
                                                checked={shareMood}
                                                onChange={(e) => togglePrivacy(e.target.checked)}
                                            />
                                            <label className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-200 cursor-pointer"></label>
                                        </div>
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
                                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="w-full">
                                                                    <button
                                                                        onClick={submitFeedback}
                                                                        disabled={submittingFeedback}
                                                                        className="mt-2 bg-white text-indigo-900 px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg"
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

                            {/* PARTNER MOOD - NEW FEATURE */}
                            {partnerStatus?.connected && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partner's Vibe</h3>
                                        {partnerStatus.lastMoodUpdate && <span className="text-[10px] text-gray-400">Updated recently</span>}
                                    </div>

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
        </div>
    );
}
