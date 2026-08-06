import React, { useState, useEffect } from 'react';

const listeners = new Set();
let toasts = [];

const emit = () => {
    listeners.forEach(listener => listener([...toasts]));
};

export const toast = {
    show: (text, type = 'success', duration = 4000) => {
        const id = Date.now() + Math.random();
        toasts = [...toasts, { id, text, type, isFadingOut: false }];
        emit();
        
        // Trigger fade out transition 300ms before actual removal
        setTimeout(() => {
            toasts = toasts.map(t => t.id === id ? { ...t, isFadingOut: true } : t);
            emit();
        }, duration - 300);

        // Remove toast from list
        setTimeout(() => {
            toasts = toasts.filter(t => t.id !== id);
            emit();
        }, duration);
    },
    success: (text, duration) => toast.show(text, 'success', duration),
    error: (text, duration) => toast.show(text, 'error', duration),
    info: (text, duration) => toast.show(text, 'info', duration),
    dismiss: (id) => {
        // Trigger fade out, then remove after 250ms
        toasts = toasts.map(t => t.id === id ? { ...t, isFadingOut: true } : t);
        emit();
        setTimeout(() => {
            toasts = toasts.filter(t => t.id !== id);
            emit();
        }, 250);
    }
};

export const useToasts = () => {
    const [state, setState] = useState(toasts);
    useEffect(() => {
        listeners.add(setState);
        return () => listeners.delete(setState);
    }, []);
    return state;
};

export const ToastContainer = () => {
    const currentToasts = useToasts();
    
    return (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full flex flex-col gap-3 pointer-events-none">
            {currentToasts.map((t) => {
                const isSuccess = t.type === 'success';
                const isError = t.type === 'error';
                const isInfo = t.type === 'info';
                
                let bgClass = 'bg-white border-slate-200 text-slate-800';
                let icon = null;
                
                if (isSuccess) {
                    bgClass = 'bg-green-50 border-green-200 text-green-800';
                    icon = (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    );
                } else if (isError) {
                    bgClass = 'bg-red-50 border-red-200 text-red-800';
                    icon = (
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    );
                } else if (isInfo) {
                    bgClass = 'bg-blue-50 border-blue-200 text-blue-800';
                    icon = (
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    );
                }
                
                return (
                    <div 
                        key={t.id} 
                        className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl border shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 ${
                            t.isFadingOut ? 'animate-fade-out' : 'animate-slide-in'
                        } ${bgClass}`}
                    >
                        {icon}
                        <span className="font-semibold text-sm flex-1">{t.text}</span>
                        <button 
                            onClick={() => toast.dismiss(t.id)} 
                            className="text-slate-400 hover:text-slate-600 transition-colors ml-auto p-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
