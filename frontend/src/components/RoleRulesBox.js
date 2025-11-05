import React from 'react';

const rulesByRole = {
  student: [
    'Maximum number of students per team is set by the admin.',
    'You can only form a team once. Team members cannot be changed after creation.',
    'Each team must have a team leader who submits guide preferences.',
    'Team formation requires guide and admin approval.',
    'Each student can only be in one team.',
    'Team formation and guide selection are only allowed during their respective periods.',
    'Team changes are not allowed after final approval.',
    'Submit final reports and attend all reviews as required.'
  ],
  guide: [
    'You can only approve or reject guide requests during the guide selection period.',
    'You are responsible for reviewing and approving teams that request you as a guide.',
    'Submit your availability for review periods as required.',
    'Mark and upload attendance for your assigned teams.',
    'You cannot change team compositions; only approve or reject requests.'
  ],
  panel: [
    'You can only review and mark your assigned teams.',
    'You cannot change team compositions or guide assignments.',
    'Provide feedback and scores for each review.',
    'Review and marking are only available during the review period.'
  ],
  coordinator: [
    'You can view all teams, guides, and panels.',
    'You can manage schedules and coordinate academic activities.',
    'You cannot change team compositions or guide assignments.',
    'You are responsible for scheduling reviews and vivas.'
  ],
  admin: [
    'You can configure periods for team formation, guide selection, and reviews.',
    'You can approve or reject teams and guides.',
    'You can view and manage all users, teams, and panels.'
  ]
};

const roleLabels = {
  student: 'Student',
  guide: 'Guide',
  panel: 'Panel Member',
  coordinator: 'Coordinator',
  admin: 'Admin'
};

const RoleRulesBox = ({ role }) => {
  const rules = rulesByRole[role] || [];
  if (!rules.length) return null;
  return (
    <div className="mb-6 p-4 bg-yellow-50 rounded border border-yellow-200">
      <div className="font-semibold text-yellow-800 mb-2">{roleLabels[role]} Rules & Guidelines</div>
      <ul className="list-disc list-inside text-yellow-900 space-y-1">
        {rules.map((rule, idx) => (
          <li key={idx}>{rule}</li>
        ))}
      </ul>
    </div>
  );
};

export default RoleRulesBox; 