'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Task {
    _id: string;
    title: string;
    description: string;
    category?: string;
    date: string;
    status: string;
    feedback: {
        userId: { _id: string; name: string } | string;
        rating: number;
        comment: string;
    }[];
    responses?: {
        userId: { _id: string; name: string } | string;
        text: string;
        date: string;
    }[];
}

export default function History() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/tasks/history');
            setTasks(res.data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-rose-50 to-indigo-50">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex justify-between items-center bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/50">
                    <div>
                        <h1 className="text-3xl font-extrabold gradient-text">Our Timeline</h1>
                        <p className="text-gray-600 font-medium mt-1">
                            {tasks.length} {tasks.length === 1 ? 'Memory' : 'Memories'} Created Together ❤️
                        </p>
                    </div>
                    <Link
                        href="/dashboard"
                        className="px-5 py-2 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        ← Back to Dashboard
                    </Link>
                </header>

                {/* Timeline */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse flex p-6 bg-white/40 rounded-2xl h-32"></div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 rounded-3xl border border-white/50 backdrop-blur-sm">
                        <div className="text-5xl mb-4">📜</div>
                        <h3 className="text-xl font-bold text-gray-700">No memories yet!</h3>
                        <p className="text-gray-500 mt-2">Complete your daily tasks to build your timeline.</p>
                        <Link href="/dashboard" className="inline-block mt-6 px-6 py-2 bg-rose-500 text-white font-bold rounded-full hover:bg-rose-600 transition-colors shadow-lg">
                            Go to Today's Task
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6 relative">
                        {/* Vertical Line Line */}
                        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-300 to-indigo-300 rounded-full hidden md:block opacity-30"></div>

                        {tasks.map((task, index) => (
                            <motion.div
                                key={task._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="glass-card p-6 rounded-2xl shadow-lg border border-white/60 relative md:ml-20 hover:scale-[1.01] transition-transform duration-300"
                            >
                                {/* Dot for Timeline */}
                                <div className="absolute -left-[3.25rem] top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-rose-400 rounded-full hidden md:block z-10 shadow-md"></div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-bold font-mono text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">
                                                {new Date(task.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                            {task.category && (
                                                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wider">
                                                    {task.category}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800">{task.title}</h3>
                                        <p className="text-gray-600 mt-1 text-sm mb-4">{task.description}</p>

                                        {/* Responses / Conversation */}
                                        {task.responses && task.responses.length > 0 && (
                                            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100/50 space-y-3">
                                                {task.responses.map((response, i) => (
                                                    <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                                                        <span className="text-xs font-bold text-indigo-600 block mb-1">
                                                            {typeof response.userId === 'object' && 'name' in response.userId ? response.userId.name : 'User'}
                                                        </span>
                                                        <p className="text-gray-700 text-sm leading-relaxed">{response.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Average Rating Display & Feedback */}
                                    <div className="flex flex-col items-end space-y-2">
                                        {task.feedback && task.feedback.length > 0 && (
                                            <div className="bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 text-yellow-700 text-sm font-bold flex items-center gap-1">
                                                <span>⭐</span>
                                                <span>{task.feedback[0].rating}/5</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
