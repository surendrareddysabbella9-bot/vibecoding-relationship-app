import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-indigo-500 to-purple-600">
            <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
                <h1 className="text-6xl font-bold text-white mb-4 text-center">
                    Connect. Engage. Grow.
                </h1>
                <p className="text-xl text-white/80 text-center max-w-2xl">
                    Your daily companion for a stronger relationship. Adaptive activities, intelligent insights, and shared growth.
                </p>

                <div className="flex gap-4 mt-8">
                    <Link
                        href="/login"
                        className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-opacity-90 transition-all"
                    >
                        Login
                    </Link>
                    <Link
                        href="/register"
                        className="px-8 py-3 bg-indigo-800 text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all border border-indigo-400"
                    >
                        Register
                    </Link>
                </div>
            </div>
        </main>
    );
}
