import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const GuideDashboard = () => {
  const [teamFormationOpen, setTeamFormationOpen] = useState(true);
  const [guideSelectionStart, setGuideSelectionStart] = useState(null);
  const [guideSelectionEnd, setGuideSelectionEnd] = useState(null);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState('');

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const token = localStorage.getItem('token');
        const configRes = await fetch('http://localhost:5000/api/teams/config/public');
        const configData = await configRes.json();
        setTeamFormationOpen(configData.teamFormationOpen);
        if (token) {
          const guideDatesRes = await fetch('http://localhost:5000/api/guide/selection-dates', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (guideDatesRes.ok) {
            const guideDates = await guideDatesRes.json();
            setGuideSelectionStart(guideDates.startDate);
            setGuideSelectionEnd(guideDates.endDate);
          }
        }
      } catch (err) {
        setRulesError('Could not load rules info.');
      } finally {
        setLoadingRules(false);
      }
    };
    fetchRules();
  }, []);

  return (
    <div className="flex flex-col space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Guide Dashboard Rules & Info</h2>
        {loadingRules ? (
          <div className="mb-4 text-blue-700">Loading rules...</div>
        ) : rulesError ? (
          <div className="mb-4 text-red-700">{rulesError}</div>
        ) : (
          <>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li>You can only approve or reject guide requests during the guide selection period.</li>
              <li>You are responsible for reviewing and approving teams that request you as a guide.</li>
              <li>Submit your availability for review periods as required.</li>
              <li>Mark and upload attendance for your assigned teams.</li>
              <li>You cannot change team compositions; only approve or reject requests.</li>
            </ul>
            <div className="p-4 bg-blue-50 rounded-md space-y-2">
              <div className="text-blue-700">
                <strong>Team Formation:</strong> {teamFormationOpen ? 'Open' : 'Closed'}
              </div>
              <div className="text-blue-700">
                <strong>Guide Selection:</strong> {guideSelectionStart ? (
                  <>
                    Starts on <span className="font-semibold">{new Date(guideSelectionStart).toLocaleString()}</span>
                    {guideSelectionEnd && (
                      <> &ndash; Ends on <span className="font-semibold">{new Date(guideSelectionEnd).toLocaleString()}</span></>
                    )}
                  </>
                ) : 'Dates not set'}
              </div>
            </div>
          </>
        )}
      </div>
      <Link to="/guide/guide-requests" className="block p-4 hover:bg-gray-100 rounded">
        Guide Requests
      </Link>
      <Link to="/guide/upload-attendance" className="block p-4 hover:bg-gray-100 rounded">
        Upload Attendance
      </Link>
    </div>
  );
};

export default GuideDashboard; 