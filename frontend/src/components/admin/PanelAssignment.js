import React from 'react';
import ManualPanelAssignment from './ManualPanelAssignment';

const PanelAssignment = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Panel Assignment (Manual)</h2>
            <ManualPanelAssignment />
        </div>
    );
};

export default PanelAssignment;