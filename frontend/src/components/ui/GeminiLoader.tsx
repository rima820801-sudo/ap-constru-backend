import React from "react";

export function GeminiLoader() {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-8 min-h-[350px] w-full overflow-hidden bg-[#1e293b] rounded-xl border border-slate-700 relative shadow-inner">
            {/* Blueprint Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            ></div>

            {/* Blueprint Animation Container */}
            <div className="relative w-64 h-64 flex items-center justify-center z-10">
                <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="blueprint-svg drop-shadow-lg">
                    {/* Main Structure (House) */}
                    <path
                        d="M30 110 L110 30 L190 110 V190 H30 V110 Z"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="draw-path"
                    />
                    
                    {/* Inner Details */}
                    {/* Door */}
                    <rect x="90" y="130" width="40" height="60" stroke="white" strokeWidth="2" fill="none" className="draw-path delay-1" />
                    {/* Window Left */}
                    <rect x="50" y="130" width="25" height="25" stroke="white" strokeWidth="2" fill="none" className="draw-path delay-2" />
                    {/* Window Right */}
                    <rect x="145" y="130" width="25" height="25" stroke="white" strokeWidth="2" fill="none" className="draw-path delay-2" />
                    {/* Attic Window */}
                    <circle cx="110" cy="80" r="12" stroke="white" strokeWidth="2" fill="none" className="draw-path delay-2" />

                    {/* Technical Dimensions (Cyan Lines) */}
                    {/* Bottom Width */}
                    <path d="M30 205 H190" stroke="#38bdf8" strokeWidth="1" className="draw-path delay-3" />
                    <path d="M30 200 V210 M190 200 V210" stroke="#38bdf8" strokeWidth="1" className="draw-path delay-3" />
                    <text x="110" y="215" fill="#38bdf8" fontSize="10" textAnchor="middle" className="fade-in delay-3 font-mono">12.00m</text>
                    
                    {/* Side Height */}
                    <path d="M15 110 V190" stroke="#38bdf8" strokeWidth="1" className="draw-path delay-3" />
                    <path d="M10 110 H20 M10 190 H20" stroke="#38bdf8" strokeWidth="1" className="draw-path delay-3" />
                    <text x="5" y="155" fill="#38bdf8" fontSize="10" textAnchor="middle" transform="rotate(-90, 5, 155)" className="fade-in delay-3 font-mono">6.50m</text>

                    {/* Construction Nodes (Dots) */}
                    <circle cx="30" cy="110" r="3" fill="#38bdf8" className="node-pop delay-4" />
                    <circle cx="110" cy="30" r="3" fill="#38bdf8" className="node-pop delay-4" />
                    <circle cx="190" cy="110" r="3" fill="#38bdf8" className="node-pop delay-4" />
                    <circle cx="190" cy="190" r="3" fill="#38bdf8" className="node-pop delay-4" />
                    <circle cx="30" cy="190" r="3" fill="#38bdf8" className="node-pop delay-4" />
                </svg>
            </div>

            <div className="text-center z-10 h-8">
                <LoadingText />
            </div>

            <style>{`
                .draw-path {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: draw 4s ease-in-out infinite;
                }
                
                .delay-1 { animation-delay: 0.5s; }
                .delay-2 { animation-delay: 1.0s; }
                .delay-3 { animation-delay: 1.5s; }
                .delay-4 { animation-delay: 2.0s; }

                .fade-in {
                    opacity: 0;
                    animation: fadeIn 4s ease-in-out infinite;
                }

                .node-pop {
                    opacity: 0;
                    transform-origin: center;
                    animation: pop 4s ease-in-out infinite;
                }

                @keyframes draw {
                    0% { stroke-dashoffset: 1000; opacity: 0; }
                    10% { opacity: 1; }
                    40% { stroke-dashoffset: 0; }
                    80% { opacity: 1; stroke-dashoffset: 0; }
                    90% { opacity: 0; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }

                @keyframes fadeIn {
                    0%, 40% { opacity: 0; }
                    50% { opacity: 1; }
                    80% { opacity: 1; }
                    90% { opacity: 0; }
                    100% { opacity: 0; }
                }

                @keyframes pop {
                    0%, 45% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.5); opacity: 1; }
                    60% { transform: scale(1); opacity: 1; }
                    80% { opacity: 1; }
                    90% { opacity: 0; }
                    100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}

function LoadingText() {
    const [index, setIndex] = React.useState(0);
    const messages = [
        "Trazando ejes principales...",
        "Calculando cargas estructurales...",
        "Diseñando volumetría...",
        "Cuantificando materiales...",
        "Consultando precios de mercado...",
        "Optimizando presupuesto..."
    ];

    React.useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % messages.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <p className="text-sm font-medium text-slate-300 tracking-widest uppercase transition-all duration-500 font-mono">
                {messages[index]}
            </p>
        </div>
    );
}
