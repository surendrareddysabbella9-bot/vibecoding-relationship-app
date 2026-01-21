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
}

interface Task {
    _id: string;
    title: string;
    description: string;
    category: string;
    status: 'pending' | 'completed';
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [partnerCode, setPartnerCode] = useState('');
    const [task, setTask] = useState<Task | null>(null);
    const [loadingTask, setLoadingTask] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/auth/user');
                setUser(res.data);

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
            // Refresh user data to show updated state
            const userRes = await api.get('/auth/user');
            setUser(userRes.data);
            fetchDailyTask(); // Fetch task after connecting
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Connection failed');
        }
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

    if (!user) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="bg-white p-6 rounded-lg shadow flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}</h1>
                        <p className="text-gray-600 text-sm mt-1">Partner Code: <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">{user.partnerLinkCode}</span></p>
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
                                    <div className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded-lg font-bold">
                                        ✅ Completed
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
                            {success && <p className="text-green-500 text-sm mt-2">{success}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
