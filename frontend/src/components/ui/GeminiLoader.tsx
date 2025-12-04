import React from "react";

export function GeminiLoader() {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-8 min-h-[300px] w-full overflow-hidden bg-slate-50 rounded-xl border border-slate-200">
            {/* Scene Container */}
            <div className="relative w-full max-w-[400px] h-[200px] flex items-end justify-center border-b-4 border-slate-800">

                {/* Crane Structure */}
                <div className="absolute left-10 bottom-0 w-4 h-[160px] bg-yellow-500 border border-slate-700 z-10 flex flex-col items-center justify-end">
                    <div className="w-full h-full flex flex-col justify-evenly">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-full h-px bg-slate-700/30"></div>
                        ))}
                        <div className="absolute inset-0 border-x-2 border-slate-700/20"></div>
                    </div>
                </div>

                {/* Crane Cab */}
                <div className="absolute left-6 bottom-[120px] w-12 h-10 bg-yellow-400 border border-slate-700 z-20 rounded-sm">
                    <div className="w-6 h-6 bg-blue-200/50 ml-1 mt-1 border border-slate-400"></div>
                </div>

                {/* Crane Arm (Jib) */}
                <div className="absolute left-12 bottom-[150px] w-[220px] h-4 bg-yellow-500 border border-slate-700 z-10 origin-left">
                    <div className="w-full h-full flex justify-evenly">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="h-full w-px bg-slate-700/30"></div>
                        ))}
                    </div>
                </div>

                {/* Counterweight */}
                <div className="absolute left-2 bottom-[148px] w-12 h-8 bg-slate-600 border border-slate-800 z-10 rounded-sm"></div>

                {/* Trolley & Hook Animation */}
                <div className="absolute left-12 bottom-[150px] w-[200px] h-[140px] z-30 pointer-events-none">
                    <div className="crane-trolley absolute top-0 h-full">
                        <div className="w-6 h-4 bg-slate-700 -mt-2 relative z-20"></div>
                        <div className="w-0.5 h-full bg-slate-800 mx-auto origin-top crane-cable"></div>
                        <div className="w-6 h-6 border-2 border-slate-800 rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center bg-white z-20">
                            <div className="w-1 h-3 bg-slate-800"></div>
                        </div>
                    </div>
                </div>

                {/* Letters being placed */}
                <div className="flex items-end space-x-2 mb-1 z-0 pl-16">
                    {["G", "E", "M", "I", "N", "I"].map((char, index) => (
                        <span
                            key={index}
                            className={`text-4xl font-black text-indigo-700 letter-block letter-appear-${index}`}
                            style={{
                                textShadow: '2px 2px 0px rgba(0,0,0,0.2)',
                                width: '30px',
                                textAlign: 'center'
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </div>
            </div>

            <div className="text-center z-10">
                <p className="text-sm font-bold text-slate-500 tracking-widest uppercase animate-pulse">
                    Construyendo Sugerencia...
                </p>
            </div>

            <style>{`
                @keyframes moveTrolley {
                    0%, 100% { left: 10%; }
                    15% { left: 20%; } /* G */
                    30% { left: 35%; } /* E */
                    45% { left: 50%; } /* M */
                    60% { left: 65%; } /* I */
                    75% { left: 80%; } /* N */
                    90% { left: 95%; } /* I */
                }

                @keyframes dropLetter {
                    0% { opacity: 0; transform: translateY(-100px); }
                    50% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                .crane-trolley {
                    animation: moveTrolley 4s steps(6, end) infinite;
                }

                .letter-block {
                    opacity: 0;
                    animation: dropLetter 4s infinite;
                }

                .letter-appear-0 { animation-delay: 0.0s; }
                .letter-appear-1 { animation-delay: 0.6s; }
                .letter-appear-2 { animation-delay: 1.2s; }
                .letter-appear-3 { animation-delay: 1.8s; }
                .letter-appear-4 { animation-delay: 2.4s; }
                .letter-appear-5 { animation-delay: 3.0s; }

            `}</style>
        </div>
    );
}
