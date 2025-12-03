import { NavLink } from "react-router-dom";

export function AppHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 flex">
                    <a className="mr-6 flex items-center space-x-2 font-bold text-slate-900 dark:text-slate-100" href="/">
                        <span className="hidden sm:inline-block">Precios Unitarios</span>
                    </a>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <NavLink
                            to="/analisis"
                            className={({ isActive }) =>
                                `transition-colors hover:text-slate-900/80 dark:hover:text-slate-50/80 ${isActive ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400'}`
                            }
                        >
                            Analisis PU
                        </NavLink>
                        <NavLink
                            to="/catalogo"
                            className={({ isActive }) =>
                                `transition-colors hover:text-slate-900/80 dark:hover:text-slate-50/80 ${isActive ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400'}`
                            }
                        >
                            Catalogos
                        </NavLink>
                        <NavLink
                            to="/comparador"
                            className={({ isActive }) =>
                                `transition-colors hover:text-slate-900/80 dark:hover:text-slate-50/80 ${isActive ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400'}`
                            }
                        >
                            Comparador
                        </NavLink>
                    </nav>
                </div>
            </div>
        </header>
    );
}
