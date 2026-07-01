import React, { useState } from 'react';
import MaxTeamSizeSettings from './MaxTeamSizeSettings';
import GuideSelectionSettings from './GuideSelectionSettings';
import ReviewsVivaSettings from './ReviewsVivaSettings';

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('guide-selection');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'guide-selection':
                return <GuideSelectionSettings />;
            case 'team-size':
                return <MaxTeamSizeSettings />;
            case 'reviews':
                return <ReviewsVivaSettings />;
            default:
                return <MaxTeamSizeSettings />;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header section with rich gradient */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
                <h1 className="text-3xl text-center font-extrabold tracking-tight">Admin Settings</h1>
                {/* <p className="mt-2 text-indigo-100 text-sm md:text-base">
                    Manage team sizes, guide selection timelines, and reviews & viva configurations from a centralized dashboard.
                </p> */}
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
