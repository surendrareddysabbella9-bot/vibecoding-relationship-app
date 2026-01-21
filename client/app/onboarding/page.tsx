"use client";
import { useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

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
            router.push('/dashboard');
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

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="mb-8">
                    <div className="h-2 bg-gray-200 rounded-full">
                        <div
                            className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">Step {step} of 3</p>
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800">Communication Style</h2>
                        <p className="text-gray-600">How do you prefer to handle conflicts or deep talks?</p>
                        <div className="space-y-2">
                            {['Direct & Honest', 'Gentle & Diplomatic', 'Need time to process', 'In-the-moment'].map(style => (
                                <button
                                    key={style}
                                    onClick={() => setFormData({ ...formData, communicationStyle: style })}
                                    className={`w-full p-3 rounded border text-left transition-all ${formData.communicationStyle === style
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                                            : 'border-gray-200 hover:border-indigo-300'
                                        }`}
                                >
                                    {style}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleNext}
                            disabled={!formData.communicationStyle}
                            className="w-full mt-6 bg-indigo-600 text-white py-2 rounded-lg font-bold disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800">Love Language</h2>
                        <p className="text-gray-600">How do you feel most loved?</p>
                        <div className="space-y-2">
                            {['Words of Affirmation', 'Acts of Service', 'Receiving Gifts', 'Quality Time', 'Physical Touch'].map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setFormData({ ...formData, loveLanguage: lang })}
                                    className={`w-full p-3 rounded border text-left transition-all ${formData.loveLanguage === lang
                                            ? 'border-purple-600 bg-purple-50 text-purple-700 font-semibold'
                                            : 'border-gray-200 hover:border-purple-300'
                                        }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={handleBack} className="flex-1 py-2 text-gray-600 hover:text-gray-800">Back</button>
                            <button
                                onClick={handleNext}
                                disabled={!formData.loveLanguage}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-800">Shared Interests</h2>
                        <p className="text-gray-600">What do you enjoy doing together?</p>
                        <div className="flex flex-wrap gap-2">
                            {['Hiking', 'Cooking', 'Gaming', 'Movies', 'Travel', 'Art', 'Fitness', 'Music'].map(interest => (
                                <button
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    className={`px-3 py-1 rounded-full border text-sm transition-all ${formData.interests.includes(interest)
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'border-gray-300 text-gray-700 hover:border-indigo-400'
                                        }`}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <input
                                type="text"
                                value={customInterest}
                                onChange={(e) => setCustomInterest(e.target.value)}
                                placeholder="Add another..."
                                className="flex-1 p-2 border rounded text-sm"
                            />
                            <button onClick={addCustomInterest} className="px-3 py-1 bg-gray-200 rounded text-sm">+</button>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={handleBack} className="flex-1 py-2 text-gray-600 hover:text-gray-800">Back</button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700"
                            >
                                Complete Setup
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
