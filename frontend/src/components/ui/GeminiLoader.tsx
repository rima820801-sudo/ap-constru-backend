import React from "react";

export function GeminiLoader() {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            {/* Logo Animation */}
            <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping opacity-25"></div>
                <div className="absolute inset-0 border-4 border-t-indigo-600 border-r-transparent border-b-indigo-600 border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-4 border-t-transparent border-r-purple-500 border-b-transparent border-l-purple-500 rounded-full animate-spin-reverse"></div>

                {/* Center Gemini Icon (Simplified Star/Sparkle) */}
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <svg
                        viewBox="0 0 24 24"
                        className="w-10 h-10 text-indigo-600"
                        fill="currentColor"
                    >
                        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                    </svg>
                </div>
            </div>

            {/* Construction Text Animation */}
            <div className="text-center">
                <div className="flex items-center justify-center space-x-1 text-2xl font-bold tracking-widest text-gray-800">
                    {["G", "E", "M", "I", "N", "I"].map((char, index) => (
                        <span
                            key={index}
                            className="inline-block animate-bounce"
                            // @ts-ignore
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {char}
                        </span>
                    ))}
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-500 font-mono">
                    <span className="animate-pulse">🏗️</span>
                    <span>CONSTRUYENDO SUGERENCIA</span>
                    <span className="animate-pulse">🏗️</span>
                </div>
            </div>

            <style>{`
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                .animate-spin-reverse {
                    animation: spin-reverse 3s linear infinite;
                }
            `}</style>
        </div>
    );
}
