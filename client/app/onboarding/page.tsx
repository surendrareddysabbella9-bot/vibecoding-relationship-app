'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

export default function Onboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        communicationStyle: '',
        loveLanguage: '',
        interests: [] as string[]
    });
    const [customInterest, setCustomInterest] = useState('');

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        try {
            await api.put('/auth/onboarding', formData);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#e11d48', '#4f46e5', '#ffffff'] // Rose, Indigo, White
            });
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        } catch (err) {
            console.error('Onboarding failed', err);
        }
    };

    const toggleInterest = (interest: string) => {
        setFormData(prev => {
            const interests = prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest];
            return { ...prev, interests };
        });
    };

    const addCustomInterest = () => {
        if (customInterest && !formData.interests.includes(customInterest)) {
            setFormData(prev => ({ ...prev, interests: [...prev.interests, customInterest] }));
            setCustomInterest('');
        }
    };

    const variants = {
        enter: { opacity: 0, x: 50 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card max-w-lg w-full p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-white/20">
                    <motion.div
                        className="h-full bg-gradient-to-r from-rose-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                <div className="mt-6 mb-8 text-center">
                    <h1 className="text-3xl font-extrabold gradient-text mb-2">Let's Get to Know You</h1>
                    <p className="text-gray-600">Step {step} of 3</p>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Communication Style 💬</h2>
                                <p className="text-sm text-gray-500 mb-4">How do you prefer to handle conflicts or deep talks?</p>
                                <div className="space-y-3">
                                    {['Direct & Honest', 'Gentle & Diplomatic', 'Need time to process', 'In-the-moment'].map(style => (
                                        <button
                                            key={style}
                                            onClick={() => setFormData({ ...formData, communicationStyle: style })}
                                            className={cn(
                                                "w-full p-4 rounded-xl border-2 text-left transition-all font-medium flex items-center justify-between",
                                                formData.communicationStyle === style
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-2 ring-indigo-200'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-white/50 text-gray-600'
                                            )}
                                        >
                                            {style}
                                            {formData.communicationStyle === style && <span>✨</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleNext}
                                disabled={!formData.communicationStyle}
                                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                            >
                                Next Step →
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Love Language ❤️</h2>
                                <p className="text-sm text-gray-500 mb-4">How do you feel most loved?</p>
                                <div className="space-y-3">
                                    {['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setFormData({ ...formData, loveLanguage: lang })}
                                            className={cn(
                                                "w-full p-4 rounded-xl border-2 text-left transition-all font-medium flex items-center justify-between",
                                                formData.loveLanguage === lang
                                                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-md ring-2 ring-rose-200'
                                                    : 'border-gray-200 hover:border-rose-300 hover:bg-white/50 text-gray-600'
                                            )}
                                        >
                                            {lang}
                                            {formData.loveLanguage === lang && <span>💝</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleBack} className="flex-1 py-3 text-gray-500 font-semibold hover:text-gray-800 transition-colors">← Back</button>
                                <button
                                    onClick={handleNext}
                                    disabled={!formData.loveLanguage}
                                    className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all transform hover:scale-[1.02]"
                                >
                                    Next Step →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Shared Interests 🎨</h2>
                                <p className="text-sm text-gray-500 mb-4">What do you enjoy doing together?</p>
                                <div className="flex flex-wrap gap-3">
                                    {['Hiking', 'Cooking', 'Gaming', 'Movies', 'Travel', 'Art', 'Fitness', 'Music'].map(interest => (
                                        <button
                                            key={interest}
                                            onClick={() => toggleInterest(interest)}
                                            className={cn(
                                                "px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all",
                                                formData.interests.includes(interest)
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                    : 'border-gray-300 text-gray-600 hover:border-indigo-400 hover:bg-white/50'
                                            )}
                                        >
                                            {interest}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <input
                                        type="text"
                                        value={customInterest}
                                        onChange={(e) => setCustomInterest(e.target.value)}
                                        placeholder="Add another..."
                                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white/50"
                                    />
                                    <button onClick={addCustomInterest} className="px-4 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition-colors">+</button>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-8">
                                <button onClick={handleBack} className="flex-1 py-3 text-gray-500 font-semibold hover:text-gray-800 transition-colors">← Back</button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-[1.02]"
                                >
                                    Complete Setup ✨
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
