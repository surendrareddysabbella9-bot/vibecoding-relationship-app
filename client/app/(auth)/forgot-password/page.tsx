'use client';
import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage(res.data.msg || 'If an account exists with this email, you will receive a password reset link.');
            setEmailSent(true);
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Failed to send email. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 space-y-8 glass-card rounded-2xl shadow-2xl"
            >
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold gradient-text">Recover Password</h2>
                    <p className="mt-2 text-sm text-gray-600">Enter your email to receive a reset link</p>
                </div>

                {emailSent ? (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">📧</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Check Your Email!</h3>
                        <p className="text-gray-600 mb-6">
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            The link will expire in 10 minutes. Check your spam folder if you don't see it.
                        </p>
                        <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                            ← Back to Login
                        </Link>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
                        {message && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">{message}</div>}

                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm bg-white/50 backdrop-blur-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending...' : 'Send Recovery Email'}
                        </button>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
