"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
    _id: string;
    name: string;
    email: string;
    partnerLinkCode: string;
    partnerId: string | null;
    onboardingData?: {
        communicationStyle: string;
        loveLanguage: string;
        interests: string[];
    };
}

interface Feedback {
    userId: string;
    rating: number;
    comment: string;
}

interface Task {
    _id: string;
    title: string;
    description: string;
    category: string;
    status: 'pending' | 'completed';
    feedback: Feedback[];
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [partnerCode, setPartnerCode] = useState('');
    const [task, setTask] = useState<Task | null>(null);
    const [loadingTask, setLoadingTask] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Feedback States
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');

    const router = useRouter();

    useEffect(() => {
        // Check for partner code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');
        if (codeFromUrl) {
            setPartnerCode(codeFromUrl);
        }

        const fetchUser = async () => {
            try {
                const res = await api.get('/auth/user');
                setUser(res.data);

                // Redirect to onboarding if not completed
                if (!res.data.onboardingData || !res.data.onboardingData.loveLanguage) {
                    router.push('/onboarding');
                    return;
                }

                if (res.data.partnerId) {
                    fetchDailyTask();
                }
            } catch (err) {
                localStorage.removeItem('token');
                router.push('/login');
            }
        };
        fetchUser();
    }, [router]);

    const fetchDailyTask = async () => {
        setLoadingTask(true);
        try {
            const res = await api.get('/tasks/daily');
            setTask(res.data);
        } catch (err) {
            console.error("Failed to fetch task", err);
        } finally {
            setLoadingTask(false);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const res = await api.post('/partner/connect', { partnerCode });
            setSuccess(`Connected with ${res.data.partnerName}!`);
            const userRes = await api.get('/auth/user');
            setUser(userRes.data);
            fetchDailyTask();
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Connection failed');
        }
    };

    const copyLink = () => {
        if (!user) return;
        const link = `${window.location.origin}/dashboard?code=${user.partnerLinkCode}`;
        navigator.clipboard.writeText(link);
        setCopySuccess('Link copied!');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const completeTask = async () => {
        if (!task) return;
        try {
            const res = await api.put(`/tasks/${task._id}/complete`);
            setTask(res.data);
        } catch (err) {
            console.error("Failed to complete task", err);
        }
    };

    const submitFeedback = async () => {
        if (!task || rating === 0) return;
        setSubmittingFeedback(true);
        try {
            const res = await api.post(`/tasks/${task._id}/feedback`, { rating, comment });
            setTask(res.data); // Update task with new feedback
            setSuccess("Feedback submitted! We'll use this to improve future tasks.");
        } catch (err) {
            console.error("Failed to submit feedback", err);
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const hasGivenFeedback = task?.feedback?.some(f => f.userId === user?._id);

    if (!user) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-600 text-sm">Partner Code: <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">{user.partnerLinkCode}</span></p>
                            <button
                                onClick={copyLink}
                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition-colors"
                            >
                                {copySuccess || 'Copy Invite Link'}
                            </button>
                        </div>
                    </div>
                    <button onClick={() => { localStorage.removeItem('token'); router.push('/login') }} className="text-sm text-red-500 hover:text-red-700">Logout</button>
                </header>

                {user.partnerId && (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            ✨ Today's Vibe
                            {task?.category && <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{task.category}</span>}
                        </h2>

                        {loadingTask ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-white/30 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/30 rounded"></div>
                                </div>
                            </div>
                        ) : task ? (
                            <div className="space-y-4">
                                <h3 className="text-2xl font-semibold">{task.title}</h3>
                                <p className="text-white/90 text-lg">{task.description}</p>

                                {task.status === 'completed' ? (
                                    <div className="mt-4 bg-white/10 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">✅ Completed</span>
                                        </div>

                                        {!hasGivenFeedback ? (
                                            <div className="mt-4 space-y-3">
                                                <p className="font-semibold">How was it? Rate to improve future tasks:</p>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => setRating(star)}
                                                            className={`text-2xl transition-transform hover:scale-110 ${rating >= star ? 'opacity-100' : 'opacity-40'}`}
                                                        >
                                                            ⭐
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    placeholder="Any thoughts? (Optional)"
                                                    className="w-full text-black p-2 rounded text-sm min-h-[60px]"
                                                />
                                                <button
                                                    onClick={submitFeedback}
                                                    disabled={rating === 0 || submittingFeedback}
                                                    className="bg-white text-indigo-600 px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                                                >
                                                    {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-sm opacity-80 mt-2">Thanks for your feedback! We'll use it to curate better tasks for you.</p>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={completeTask}
                                        className="mt-4 bg-white text-indigo-600 px-6 py-2 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md"
                                    >
                                        Mark as Complete
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p>Generating your daily task...</p>
                        )}
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow">
                    {success && <p className="mb-4 text-green-600 bg-green-50 p-2 rounded">{success}</p>}
                    <h2 className="text-xl font-bold mb-4">Relationship Status</h2>

                    {user.partnerId ? (
                        <div className="p-4 bg-green-50 text-green-700 rounded border border-green-200">
                            You are connected with your partner! ❤️
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-600">You are not connected yet. Share your code with your partner or enter theirs below.</p>

                            <form onSubmit={handleConnect} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter Partner's Code</label>
                                    <input
                                        type="text"
                                        value={partnerCode}
                                        onChange={(e) => setPartnerCode(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="e.g. 7f3a1b"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Connect
                                </button>
                            </form>
                            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
