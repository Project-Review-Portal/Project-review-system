import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import ProgrammeManagement from './ProgrammeManagement';

const TABS = [
    { key: 'faculty', label: '👥 Faculty & Designation Limits' },
    { key: 'programmes', label: '🎓 PG Programmes' },
];

const GlobalManagement = () => {
    const [activeTab, setActiveTab] = useState('faculty');
    const navigate = useNavigate();

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Global Management</h2>
                <p className="text-gray-500 text-sm">Manage shared resources across all programmes.</p>
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
