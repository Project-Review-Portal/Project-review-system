import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserManagement from './UserManagement';
import ProgrammeManagement from './ProgrammeManagement';

const TABS = [
    { key: 'faculty', label: '👥 Faculty & Designation Limits' },
    { key: 'programmes', label: '🎓 Programs Offered' },
];

const GlobalManagement = () => {
    const [activeTab, setActiveTab] = useState('faculty');
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const storedSessionId = sessionId || localStorage.getItem('selectedSessionId');
    const storedSessionName = localStorage.getItem('selectedSessionName');

    const handleBack = () => {
        if (storedSessionId) {
            navigate(`/admin-dashboard/session/${storedSessionId}`);
        } else {
            navigate('/admin-dashboard');
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-6 px-4">
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-white px-3 py-1.5 rounded-md border shadow-sm transition"
                >
                    ← Back to Session Programmes
                </button>
                {storedSessionName && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        🗓️ {storedSessionName}
                    </span>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    Global Management {storedSessionName ? `(${storedSessionName})` : ''}
                </h2>
                <p className="text-gray-500 text-sm">Manage faculty lists, designation limits, and programs offered for this session.</p>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-5 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'faculty' && <UserManagement globalOnly />}
            {activeTab === 'programmes' && <ProgrammeManagement />}
        </div>
    );
};

export default GlobalManagement;
