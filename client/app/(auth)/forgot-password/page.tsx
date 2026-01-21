'use client';
import { useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [resetLink, setResetLink] = useState('');

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setResetLink('');
        try {
            const res = await api.post('/auth/forgot-password', { email });
            setMessage('Recovery email sent! (Check below for demo link)');
            // For Demo:
            if (res.data.data) {
                setResetLink(res.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Failed to send email');
        }
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

                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
                    {message && <div className="text-green-600 text-sm bg-green-50 p-2 rounded border border-green-200">{message}</div>}

                    {resetLink && (
                        <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mt-4 text-center">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Demo Only: Click to Reset</p>
                            <Link href={resetLink} className="text-indigo-600 font-bold underline break-all hover:text-indigo-800">
                                Click Here to Reset Password
                            </Link>
                        </div>
                    )}

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
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 shadow-lg"
                    >
                        Send Recovery Email
                    </button>

                    <div className="text-center mt-4">
                        <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
