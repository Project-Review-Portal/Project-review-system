import React, { useState } from 'react';
import MaxTeamSizeSettings from './MaxTeamSizeSettings';
import GuideSelectionSettings from './GuideSelectionSettings';
import ReviewsVivaSettings from './ReviewsVivaSettings';

const AdminSettings = ({ programme = 'B.E. CSE' }) => {
    const [activeTab, setActiveTab] = useState('guide-selection');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'guide-selection':
                return <GuideSelectionSettings programme={programme} />;
            case 'team-size':
                return <MaxTeamSizeSettings programme={programme} />;
            case 'reviews':
                return <ReviewsVivaSettings programme={programme} />;
            default:
                return <MaxTeamSizeSettings programme={programme} />;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header section with rich gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white flex flex-col md:flex-row justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Admin Settings</h1>
                    <p className="text-indigo-100 text-sm mt-1">
                        Programme-specific configurations
                    </p>
                </div>
                {programme && (
                    <div className="mt-3 md:mt-0 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-white font-semibold text-sm">
                        Editing Settings for: <span className="underline decoration-indigo-300 font-bold">{programme}</span>
                    </div>
                )}
            </div>

            {/* Tab navigation */}
            <div className="border-b border-gray-200 bg-gray-50 px-6">
                <nav className="flex -mb-px space-x-8" aria-label="Tabs">
                    <button
                        id="tab-guide-selection"
                        onClick={() => setActiveTab('guide-selection')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'guide-selection'
                                ? 'border-indigo-600 text-indigo-600 font-bold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Guide Settings
                    </button>
                    <button
                        id="tab-team-size"
                        onClick={() => setActiveTab('team-size')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'team-size'
                                ? 'border-indigo-600 text-indigo-600 font-bold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Team Size
                    </button>
                    <button
                        id="tab-reviews"
                        onClick={() => setActiveTab('reviews')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'reviews'
                                ? 'border-indigo-600 text-indigo-600 font-bold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Review Settings
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 bg-white">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminSettings;
