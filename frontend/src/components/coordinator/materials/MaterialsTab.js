import React, { useState } from 'react';
import MaterialSettings from './MaterialSettings';
import MaterialUploads from './MaterialUploads';

const MaterialsTab = () => {
    const [activeTab, setActiveTab] = useState('settings');

    return (
        <div className="mx-4 mt-4">
            {/* Sub-tab header */}
            <div className="flex items-center space-x-1 border-b border-gray-200 mb-0 bg-white rounded-t-lg shadow-sm px-4 pt-3">
                <button
                    id="materials-tab-settings"
                    onClick={() => setActiveTab('settings')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-md transition-all duration-150 focus:outline-none ${
                        activeTab === 'settings'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                    ⚙️ Settings
                </button>
                <button
                    id="materials-tab-uploads"
                    onClick={() => setActiveTab('uploads')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-md transition-all duration-150 focus:outline-none ${
                        activeTab === 'uploads'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                    📂 Team Uploads
                </button>
                <span className="ml-auto text-xs text-gray-400 pb-2 pr-1 hidden sm:block">
                    Materials Management
                </span>
            </div>

            {/* Tab content */}
            <div className="bg-white rounded-b-lg shadow">
                {activeTab === 'settings' && <MaterialSettings />}
                {activeTab === 'uploads' && <MaterialUploads />}
            </div>
        </div>
    );
};

export default MaterialsTab;
