'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

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
    const [task, setTask] = useState<Task | null>(null);
    const [loadingTask, setLoadingTask] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
    const [submittingMood, setSubmittingMood] = useState(false);

    // New State for Bonus Features
    const [intensity, setIntensity] = useState(2); // 1, 2, 3
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

            // Initialize UI controls from user data
            if (res.data.taskIntensity) setIntensity(res.data.taskIntensity);
            if (res.data.moodPrivacy !== undefined) setShareMood(res.data.moodPrivacy);

            if (res.data.partnerId) {
                fetchDailyTask(res.data);
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

            // Correctly check if THIS user has given feedback
            if (res.data.feedback && res.data.feedback.length > 0) {
                const myFeedback = res.data.feedback.find((f: any) =>
                    f.userId === currentUser._id || (f.userId._id && f.userId._id === currentUser._id)
                );
                if (myFeedback) {
                    setHasGivenFeedback(true);
                }
            }
        } catch (err) {
            console.error("Failed to fetch task", err);
        }
        setLoadingTask(false);
    };

    const handleMoodSubmit = async (mood: string) => {
        setSubmittingMood(true);
        try {
            await api.put('/auth/mood', {
                mood,
                intensity,
                privacy: shareMood
            });
            setUser(prev => prev ? { ...prev, currentMood: mood } : null);

            // Refresh task if needed based on new mood/intensity? 
            // For now, simpler to just update state.
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
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
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
        <div className="min-h-screen p-8 transition-colors duration-500">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-4xl mx-auto space-y-6"
            >
                {/* VIBE CHECK SECTION */}
                <div className="glass-card p-6 rounded-2xl shadow-xl mb-6 border-white/50">
                    <h2 className="text-2xl font-bold mb-4 gradient-text">✨ Vibe Check</h2>

                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <p className="text-gray-700 font-medium">How are you feeling right now?</p>

                        <div className="flex items-center gap-6">
                            {/* Privacy Toggle */}
                            <div className="flex items-center gap-2" title="Share your mood with your partner?">
                                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Share Mode</span>
                                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="toggle"
                                        id="toggle"
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:bg-green-400 checked:border-green-400 checked:right-0 right-0 transform transition-transform duration-200"
                                        checked={shareMood}
                                        onChange={(e) => setShareMood(e.target.checked)}
                                    />
                                    <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Intensity Slider */}
                    <div className="mb-6 bg-white/40 p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Task Intensity</span>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                {intensity === 1 ? 'Chill ☕' : intensity === 2 ? 'Balanced ⚖️' : 'Deep 🔥'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="1"
                            value={intensity}
                            onChange={(e) => setIntensity(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1 font-medium">
                            <span>Light</span>
                            <span>Medium</span>
                            <span>Spicy</span>
                        </div>
                    </div>

                    <div className="flex gap-4 flex-wrap">
                        {MOODS.map((m) => (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                key={m}
                                onClick={() => handleMoodSubmit(m)}
                                disabled={submittingMood}
                                className={cn(
                                    "px-5 py-2 rounded-full border-2 transition-all font-semibold shadow-sm",
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

                <header className="glass-card p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center bg-white/60 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Welcome, {user.name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <p className="text-gray-600 font-medium">Partner Code: <span className="font-mono font-bold bg-white px-3 py-1 rounded-lg border border-gray-200 text-indigo-600 shadow-inner select-all">{user.partnerLinkCode}</span></p>
                            <button
                                onClick={copyCode}
                                className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 transition-colors font-bold"
                            >
                                {copySuccess || 'Copy Code'}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.push('/history')} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm border border-indigo-100">
                            📜 Timeline
                        </button>
                        <button onClick={() => { localStorage.removeItem('token'); router.push('/login') }} className="text-sm font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 px-4 py-2 rounded-lg hover:bg-rose-100 transition-colors shadow-sm border border-rose-100">
                            Logout
                        </button>
                    </div>
                </header>

                {user.partnerId && (
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="bg-gradient-to-r from-rose-500 to-indigo-600 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden"
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            ❤️ Today's Vibe
                            {task?.category && <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-mono uppercase tracking-wider">{task.category}</span>}
                        </h2>

                        {loadingTask ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-6 bg-white/30 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/30 rounded"></div>
                                </div>
                            </div>
                        ) : task ? (
                            <div className="space-y-6">
                                <h3 className="text-4xl font-extrabold leading-tight">{task.title}</h3>
                                <p className="text-white/90 text-xl font-light">{task.description}</p>

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
                                                <p className="font-semibold text-lg">How was it? Rate to improve future tasks:</p>
                                                <div className="flex gap-3">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => setRating(star)}
                                                            className={`text-3xl transition-transform hover:scale-125 focus:outline-none ${rating >= star ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}
                                                        >
                                                            ⭐
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    placeholder="Any thoughts? (Optional)"
                                                    className="w-full text-gray-900 p-3 rounded-xl text-sm min-h-[80px] focus:ring-2 focus:ring-white/50 outline-none"
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
                                            <p className="text-lg font-medium opacity-90 mt-2">Thanks for your feedback! We'll use it to curate better tasks for you. ✨</p>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={completeTask}
                                        className="mt-6 bg-white text-indigo-600 px-8 py-3 rounded-full font-bold text-lg hover:shadow-xl transition-all shadow-md flex items-center gap-2"
                                    >
                                        Mark as Complete <span>✨</span>
                                    </motion.button>
                                )}
                            </div>
                        ) : (
                            <p className="text-lg italic">Generating your daily task...</p>
                        )}
                    </motion.div>
                )}

                <div className="glass-card p-8 rounded-2xl shadow-lg border-white/60 bg-white/40">
                    {success && <p className="mb-4 text-green-700 bg-green-100 p-3 rounded-lg font-medium border border-green-200">{success}</p>}
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Relationships Status</h2>

                    {user.partnerId ? (
                        <div className="p-6 bg-green-50/80 text-green-800 rounded-xl border border-green-200 flex items-center gap-4">
                            <div className="text-4xl animate-bounce">❤️</div>
                            <div>
                                <h3 className="font-bold text-lg">Connected!</h3>
                                <p>You are officially pair-programmed for life.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-600">You are not connected yet. Share your code or enter theirs below.</p>

                            <form onSubmit={handleConnect} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter Partner's Code</label>
                                    <input
                                        type="text"
                                        value={partnerCode}
                                        onChange={(e) => setPartnerCode(e.target.value)}
                                        className="block w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-rose-500 focus:border-rose-500 bg-white/50 backdrop-blur-sm"
                                        placeholder="e.g. 7f3a1b"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-indigo-500/30 transition-shadow"
                                >
                                    Connect
                                </button>
                            </form>
                            {error && <p className="text-red-500 text-sm mt-2 font-semibold bg-red-50 p-2 rounded">{error}</p>}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
