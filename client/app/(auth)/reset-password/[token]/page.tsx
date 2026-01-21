'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';

// Eye icons as inline SVG
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
);

export default function ResetPassword() {
    const router = useRouter();
    const params = useParams();
    const token = params.token;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            await api.put(`/auth/reset-password/${token}`, { password });
            setMessage('Password updated! Redirecting to login...');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.msg || 'Failed to reset password');
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
                    <h2 className="text-3xl font-extrabold gradient-text">Reset Password</h2>
                    <p className="mt-2 text-sm text-gray-600">Enter your new password below</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
                    {message && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">{message}</div>}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm bg-white/50 backdrop-blur-sm"
                                    placeholder="Min 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    minLength={6}
                                    className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm bg-white/50 backdrop-blur-sm"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                    >
                        Update Password
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
