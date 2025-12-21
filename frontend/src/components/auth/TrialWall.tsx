import React from 'react';
import { useUser } from '../../context/user';
import { Lock, Clock, CreditCard } from 'lucide-react';

interface TrialWallProps {
    children: React.ReactNode;
}

export const TrialWall: React.FC<TrialWallProps> = ({ children }) => {
    const { user } = useUser();

    // Si no hay usuario, el ProtectedRoute ya lo habrá manejado, 
    // pero por seguridad retornamos null
    if (!user) return null;

    // Si es admin o el trial sigue activo, mostramos el contenido normal
    if (user.is_admin || user.trial_active) {
        return <>{children}</>;
    }

    // Si el trial expiró y no es premium, mostramos el bloqueo
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
                <div className="bg-red-50 p-6 flex justify-center">
                    <div className="bg-red-100 p-4 rounded-full">
                        <Lock className="w-12 h-12 text-red-600" />
                    </div>
                </div>

                <div className="p-8 text-center space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900">Periodo de prueba terminado</h2>
                        <p className="text-gray-500 text-sm">
                            Tu acceso gratuito de 3 días ha expirado. Esperamos que hayas disfrutado de las herramientas de IA para tus presupuestos.
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 text-left">
                        <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Registrado el</p>
                            <p className="text-sm font-medium text-gray-700">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '--'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-semibold text-gray-700">
                            Para seguir usando APU Builder IA y guardar tus proyectos, activa tu suscripción anual.
                        </p>

                        <button
                            onClick={() => alert("Próximamente: Integración con plataforma de pago.")}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
                        >
                            <CreditCard className="w-5 h-5" />
                            Deseo activar mi cuenta
                        </button>

                        <p className="text-[10px] text-gray-400">
                            Si ya realizaste el pago y tu cuenta sigue bloqueada, contacta a soporte@apubuilder.com
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
