import React from 'react';

const defaultStageNames = ['Review 0', 'Review 1', 'Review 2', 'Review 3', 'Viva'];

/** The shared academic-progress signature for all role dashboards. */
const ReviewRail = ({ current = 1, scores = [], compact = false, label = 'Review progress', stages = defaultStageNames }) => {
    const activeStages = Array.isArray(stages) && stages.length > 0 ? stages : defaultStageNames;
    const progress = Math.max(0, Math.min(100, (current / Math.max(1, activeStages.length - 1)) * 100));
    return (
        <section className={`review-rail ${compact ? 'review-rail-compact' : ''}`} aria-label={label}>
            {!compact && <div className="review-rail-heading"><span>Academic record</span><strong>{label}</strong></div>}
            <div className="review-rail-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="review-rail-stages">
                {activeStages.map((stage, index) => {
                    const state = index < current ? 'complete' : index === current ? 'current' : 'upcoming';
                    return <div key={stage} className={`review-stage ${state}`}>
                        <span className="review-node">{index < current ? '✓' : index + 1}</span>
                        <strong>{stage}</strong>
                        {index < current && scores[index] !== undefined && scores[index] !== null && scores[index] !== '' && <small className="review-score">AVG {scores[index]}</small>}
                        {index === current && <small className="review-current-label">CURRENT</small>}
                    </div>;
                })}
            </div>
        </section>
    );
};

export default ReviewRail;
