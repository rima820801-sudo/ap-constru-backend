import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, BoxSelect, ShieldCheck, HelpCircle, Rocket, Calculator } from 'lucide-react';
import { useUser } from '../../context/user';

export function Navbar() {
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Brand */}
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                                <BoxSelect className="w-5 h-5" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                                APU <span className="font-normal text-slate-400">| Builder IA</span>
                            </h1>
                        </div>
                        {/* Desktop Menu */}
                        <div className="hidden md:ml-8 md:flex md:space-x-4">
                            <Link to="/analisis" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/analisis') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                Análisis APU
                            </Link>
                            <Link to="/catalogo" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/catalogo') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                Catálogo
                            </Link>
                            <Link to="/comparador" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/comparador') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                Comparador
                            </Link>
                            <Link to="/guia" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/guia') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                <HelpCircle className="w-4 h-4" /> Guía
                            </Link>
                            <Link to="/changelog" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/changelog') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                <Rocket className="w-4 h-4" /> Novedades
                            </Link>
                            <Link to="/config/fasar" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/config/fasar') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                <Calculator className="w-4 h-4" /> FASAR
                            </Link>
                            {user?.is_admin && (
                                <Link to="/admin" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${isActive('/admin') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                                    <ShieldCheck className="w-4 h-4" /> Panel Admin
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Search Bar (Desktop) */}
                    <div className="hidden md:flex items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            aria-expanded="false"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <Link to="/analisis" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/analisis') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                            Análisis APU
                        </Link>
                        <Link to="/catalogo" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/catalogo') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                            Catálogo
                        </Link>
                        <Link to="/comparador" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/comparador') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                            Comparador
                        </Link>
                        <Link to="/guia" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/guia') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                            Guía de Uso
                        </Link>
                        <Link to="/changelog" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/changelog') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                            Novedades
                        </Link>
                        <Link to="/config/fasar" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/config/fasar') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                            <Calculator className="w-4 h-4 inline mr-2" /> Configurar FASAR
                        </Link>
                        {user?.is_admin && (
                            <Link to="/admin" className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin') ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'}`} onClick={() => setIsOpen(false)}>
                                Panel Administrativo
                            </Link>
                        )}
                    </div>
                    <div className="pt-4 pb-4 border-t border-gray-200">
                        <div className="px-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
