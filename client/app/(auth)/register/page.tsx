"use client";
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const { name, email, password } = formData;

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const checkEmail = async () => {
        if (!email || !email.includes('@')) return;

        try {
            const res = await api.post('/auth/check-email', { email });
            if (res.data.exists) {
                setError('User already exists. Please login instead.');
            } else {
                if (error === 'User already exists. Please login instead.') {
                    setError('');
                }
            }
        } catch (err) {
            console.error('Email check failed', err);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await api.post('/auth/register', formData);
            localStorage.setItem('token', res.data.token);
            router.push('/onboarding');
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setError(err.response.data.errors[0].msg);
            } else {
                setError(err.response?.data?.msg || 'Registration failed');
            }
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 space-y-8 glass-card rounded-2xl shadow-2xl"
            >
                <div>
                    <h2 className="mt-6 text-4xl font-extrabold text-center gradient-text">Create Account</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">Start your better relationship today</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={onSubmit}>
                    {error && (
                        <div className="bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 p-4 rounded">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                            {error.includes('already exists') && (
                                <Link href="/login" className="text-indigo-600 hover:text-indigo-800 text-sm font-bold mt-1 block">
                                    Click here to Login &rarr;
                                </Link>
                            )}
                        </div>
                    )}
                    <div className="rounded-md space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                name="name"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm bg-white/50 backdrop-blur-sm transition-all focus:bg-white"
                                placeholder="e.g. Alice"
                                value={name}
                                onChange={onChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm bg-white/50 backdrop-blur-sm transition-all focus:bg-white"
                                placeholder="name@example.com"
                                value={email}
                                onChange={onChange}
                                onBlur={checkEmail}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 sm:text-sm pr-10 bg-white/50 backdrop-blur-sm transition-all focus:bg-white"
                                    placeholder="Min 6 characters"
                                    value={password}
                                    onChange={onChange}
                                />
                                {password.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                        </div>
                    </div>

                    <div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg"
                        >
                            Sign up
                        </motion.button>
                    </div>
                    <div className="text-sm text-center">
                        <Link href="/login" className="font-medium text-rose-600 hover:text-rose-500 transition-colors">
                            Already have an account? Sign in
                        </Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
