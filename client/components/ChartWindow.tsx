'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Heart, MessageCircle, X, Minus } from 'lucide-react';
import api from '@/lib/api';

interface ChartWindowProps {
    user: any;
    partnerStatus: any;
    isOpen: boolean;
    onClose: () => void;
}

interface ChartData {
    moodData: any[];
    completionData: { date: string; completed: number }[];
    communicationData: { date: string; responses: number }[];
    feedbackData: { date: string; rating: number }[];
    streaks: { current: number; max: number };
    summary: { totalTasks: number; totalResponses: number; avgRating: number; completionRate: number };
}

export default function ChartWindow({ user, partnerStatus, isOpen, onClose }: ChartWindowProps) {
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'tasks' | 'communication' | 'feedback'>('tasks');

    useEffect(() => {
        if (isOpen && user?.partnerId) {
            fetchChartData();
        }
    }, [isOpen, user?.partnerId]);

    const fetchChartData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/charts/data');
            setChartData(res.data);
        } catch (err) {
            console.error('Failed to fetch chart data:', err);
        }
        setLoading(false);
    };

    const renderTaskChart = () => {
        if (!chartData?.completionData) return <div className="text-center py-8 text-gray-500">No data available</div>;

        const maxCompleted = Math.max(...chartData.completionData.map(d => d.completed), 1);
        const maxHeight = 120;

        return (
            <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                    Daily task completion over the last 30 days
                </div>
                <div className="flex items-end gap-1 h-32">
                    {chartData.completionData.map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: (day.completed / maxCompleted) * maxHeight }}
                                transition={{ delay: i * 0.02, duration: 0.5 }}
                                className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-sm min-h-[2px]"
                            />
                            <span className="text-[8px] text-gray-400 rotate-45 origin-center whitespace-nowrap">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="text-center text-sm text-gray-600">
                    Average: {chartData.summary.completionRate} tasks/day
                </div>
            </div>
        );
    };

    const renderCommunicationChart = () => {
        if (!chartData?.communicationData) return <div className="text-center py-8 text-gray-500">No data available</div>;

        const maxResponses = Math.max(...chartData.communicationData.map(d => d.responses), 1);
        const maxHeight = 120;

        return (
            <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                    Daily communication (responses) over the last 30 days
                </div>
                <div className="flex items-end gap-1 h-32">
                    {chartData.communicationData.map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: (day.responses / maxResponses) * maxHeight }}
                                transition={{ delay: i * 0.02, duration: 0.5 }}
                                className="w-full bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-sm min-h-[2px]"
                            />
                            <span className="text-[8px] text-gray-400 rotate-45 origin-center whitespace-nowrap">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="text-center text-sm text-gray-600">
                    Total responses: {chartData.summary.totalResponses}
                </div>
            </div>
        );
    };

    const renderFeedbackChart = () => {
        if (!chartData?.feedbackData || chartData.feedbackData.length === 0) {
            return <div className="text-center py-8 text-gray-500">No feedback data available yet</div>;
        }

        return (
            <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                    Task feedback ratings over time
                </div>
                <div className="space-y-3">
                    {chartData.feedbackData.slice(-10).map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-gray-500 w-16">
                                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex-1 flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.div
                                        key={star}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.1 + star * 0.05, duration: 0.3 }}
                                        className={`w-4 h-4 rounded-full ${star <= item.rating ? 'bg-yellow-400' : 'bg-gray-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-gray-600 w-8">{item.rating}</span>
                        </div>
                    ))}
                </div>
                <div className="text-center text-sm text-gray-600">
                    Average rating: {chartData.summary.avgRating} ⭐
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl">
                                <BarChart3 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Relationship Insights</h2>
                                <p className="text-sm text-gray-600">Track your journey together</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Stats Overview */}
                    {chartData && (
                        <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-indigo-50 border-b border-gray-100">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-emerald-600">{chartData.streaks.current}</div>
                                    <div className="text-xs text-gray-600">Current Streak</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-indigo-600">{chartData.summary.totalTasks}</div>
                                    <div className="text-xs text-gray-600">Tasks Completed</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-rose-600">{chartData.summary.totalResponses}</div>
                                    <div className="text-xs text-gray-600">Total Responses</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-yellow-600">{chartData.summary.avgRating || '-'}</div>
                                    <div className="text-xs text-gray-600">Avg Rating</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="px-6 py-4">
                        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                            {[
                                { id: 'tasks', label: 'Tasks', icon: TrendingUp },
                                { id: 'communication', label: 'Chat', icon: MessageCircle },
                                { id: 'feedback', label: 'Feedback', icon: Heart }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chart Content */}
                    <div className="px-6 pb-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-2xl p-6">
                                {activeTab === 'tasks' && renderTaskChart()}
                                {activeTab === 'communication' && renderCommunicationChart()}
                                {activeTab === 'feedback' && renderFeedbackChart()}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}