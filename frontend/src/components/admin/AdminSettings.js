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
        <div className="settings-card bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="settings-card-heading px-6 py-7">
                <p className="page-kicker">Rules of record</p>
                <h2 className="text-3xl font-extrabold tracking-tight">Academic settings</h2>
                <p>Define the working rules for the current review cycle.</p>
            </div>

            {/* Tab navigation */}
            <div className="settings-tabs border-b border-gray-200 px-6">
                <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                    <button
                        id="tab-guide-selection"
                        onClick={() => setActiveTab('guide-selection')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                            activeTab === 'guide-selection'
                                ? 'border-current text-current font-bold'
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
                                ? 'border-current text-current font-bold'
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
                                ? 'border-current text-current font-bold'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Review Settings
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="settings-tab-content p-6 bg-white" key={activeTab}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminSettings;
