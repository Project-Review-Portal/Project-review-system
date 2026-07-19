import React, { useState } from 'react';
import UserManagement from './UserManagement';
import ProgrammeManagement from './ProgrammeManagement';
import ReviewRail from '../ReviewRail';

const TABS = [
    { key: 'faculty', label: 'Faculty register', detail: 'Faculty records & designation limits', index: '01' },
    { key: 'programmes', label: 'Programme register', detail: 'Postgraduate programme catalogue', index: '02' },
];

const GlobalManagement = () => {
    const [activeTab, setActiveTab] = useState('faculty');
    const active = TABS.find((tab) => tab.key === activeTab);

    return (
        <main className="global-workspace">
            <header className="global-hero">
                <div><p className="page-kicker">Institutional administration</p><h1>Global management</h1><p>Maintain the shared registers that support every project-review programme.</p></div>
                <div className="global-mark"><small>REVIEW RAIL</small><strong>Central<br />register</strong></div>
            </header>

            <ReviewRail current={0} label="Academic year setup" />

            <div className="global-tabs" role="tablist" aria-label="Global management sessions">
                {TABS.map((tab) => (
                    <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={activeTab === tab.key ? 'global-tab active' : 'global-tab'}>
                        <span>{tab.index}</span><div><strong>{tab.label}</strong><small>{tab.detail}</small></div><b>→</b>
                    </button>
                ))}
            </div>

            <section className="global-session" key={activeTab}>
                <div className="session-caption"><span>{active.index}</span><div><p className="page-kicker">{active.label}</p><p>{active.detail}</p></div></div>
                {activeTab === 'faculty' ? <UserManagement globalOnly /> : <ProgrammeManagement />}
            </section>
        </main>
    );
};

export default GlobalManagement;
