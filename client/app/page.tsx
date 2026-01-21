"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <main className="min-h-screen relative overflow-hidden flex flex-col items-center">

            {/* BACKGROUND DECORATION */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <motion.div
                    animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[15%] left-[10%] text-6xl md:text-8xl opacity-30 select-none blur-[1px]"
                >
                    💖
                </motion.div>
                <motion.div
                    animate={{ y: [0, 40, 0], rotate: [0, -10, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-[20%] right-[10%] text-6xl md:text-8xl opacity-30 select-none blur-[1px]"
                >
                    ✨
                </motion.div>
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[40%] right-[20%] w-64 h-64 bg-rose-400 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-[10%] left-[20%] w-72 h-72 bg-indigo-400 rounded-full blur-[100px]"
                />
            </div>

            {/* HERO SECTION */}
            <div className="w-full max-w-6xl px-6 pt-32 pb-20 flex flex-col items-center text-center z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="mb-6 inline-block"
                >
                    <span className="bg-white/50 backdrop-blur-md border border-white/60 px-4 py-1.5 rounded-full text-indigo-700 font-bold text-sm tracking-wide shadow-sm">
                        🚀 The #1 App for Modern Couples
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 mb-6 leading-tight drop-shadow-sm"
                >
                    VibeSync
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl md:text-2xl text-gray-600 max-w-2xl mb-10 leading-relaxed font-medium"
                >
                    Sync your hearts, share your moods, and grow together.
                    Daily prompts and deep insights to keep the spark alive.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="flex gap-4 flex-col sm:flex-row w-full sm:w-auto"
                >
                    <Link
                        href="/login"
                        className="px-8 py-4 bg-white hover:bg-gray-50 text-indigo-700 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
                    >
                        Login
                    </Link>
                    <Link
                        href="/register"
                        className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:shadow-rose-500/25 hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto"
                    >
                        Start Your Journey &rarr;
                    </Link>
                </motion.div>
            </div>

            {/* FEATURE CARDS - FLOATING MOCKUP EFFECT */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="w-full max-w-5xl px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {/* Card 1 */}
                <div className="glass-card p-8 rounded-3xl hover:scale-105 transition-transform duration-300 group">
                    <div className="bg-rose-100 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:rotate-12 transition-transform">
                        🎭
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Mood Tracking</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Share how you feel instantly. Understand your partner's emotional landscape without guessing.
                    </p>
                </div>

                {/* Card 2 */}
                <div className="glass-card p-8 rounded-3xl hover:scale-105 transition-transform duration-300 group relative overflow-hidden">
                    <div className="bg-indigo-100 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:rotate-12 transition-transform">
                        💬
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Deep Talk</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Daily AI-powered questions to spark meaningful conversations and uncover new stories.
                    </p>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                </div>

                {/* Card 3 */}
                <div className="glass-card p-8 rounded-3xl hover:scale-105 transition-transform duration-300 group">
                    <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:rotate-12 transition-transform">
                        📜
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Shared Memories</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Build a timeline of your relationship milestones. Never forget a special moment.
                    </p>
                </div>
            </motion.div>

            {/* FOOTER */}
            <footer className="w-full py-8 text-center text-gray-400 text-xs uppercase tracking-wider">
                © 2024 VibeSync • Built with ❤️ for Hackathon
            </footer>
        </main>
    );
}
