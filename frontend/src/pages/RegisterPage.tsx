import React, { useState } from 'react';
import { useUser } from '../context/user';
import { useNavigate, Link } from 'react-router-dom';

export const RegisterPage = () => {
    const { register } = useUser();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        const result = await register(username, password);
        setLoading(false);

        if (result.success) {
            navigate('/analisis');
        } else {
            setError(result.error || 'Error al registrar. El usuario podría ya existir.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded shadow-md w-full max-w-sm border border-gray-700">
                <h2 className="text-2xl font-bold mb-2 text-center text-indigo-400">Crear Cuenta</h2>
                <p className="text-gray-400 text-sm mb-6 text-center italic">Obtén 3 días gratis de prueba</p>

                {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-2 mb-4 rounded text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium">Usuario</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ej: juan_perez"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium">Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium">Confirmar Contraseña</label>
                        <input
                            type="password"
                            required
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Registrando...' : 'Registrarme'}
                    </button>
                </form>

                <p className="mt-6 text-center text-gray-400 text-sm">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                        Inicia sesión aquí
                    </Link>
                </p>
            </div>
        </div>
    );
};
