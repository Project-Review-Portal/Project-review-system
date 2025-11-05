import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../../styles/AuthForms.css'; // Assuming common styling

const GuideSelection = () => {
    const [availableGuides, setAvailableGuides] = useState([]);
    const [selectedGuideId, setSelectedGuideId] = useState('');
    const [teamInfo, setTeamInfo] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [guideAssignmentPeriodEnd, setGuideAssignmentPeriodEnd] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Authentication required.');
                    navigate('/login');
                    return;
                }

                // Fetch user's team info and guide assignment period end
                const teamRes = await axios.get('http://localhost:5000/api/team/my-team', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setTeamInfo(teamRes.data);
                setGuideAssignmentPeriodEnd(teamRes.data.guideAssignmentPeriodEnd);

                // Fetch available guides only if the team is approved and guide not yet assigned/pending/finalized
                // Or if guide request was rejected, allow re-selection
                const isTeamLeader = teamRes.data.isTeamLeader;
                const teamStatus = teamRes.data.status;
                const guideStatus = teamRes.data.guidePreference.status;
                const isGuideFinalized = teamRes.data.isGuideFinalized;
                const periodEnded = teamRes.data.guideAssignmentPeriodEnd && new Date() > new Date(teamRes.data.guideAssignmentPeriodEnd);


                if (isTeamLeader && teamStatus === 'approved' && !isGuideFinalized && !periodEnded) {
                    if (guideStatus === 'none' || guideStatus === 'rejected') {
                        const guidesRes = await axios.get('http://localhost:5000/api/team/guides', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        setAvailableGuides(guidesRes.data);
                    }
                } else if (!isTeamLeader) {
                    setError('Only the team leader can select a guide.');
                } else if (teamStatus !== 'approved') {
                    setError('Your team must be approved by the admin before you can select a guide.');
                } else if (isGuideFinalized) {
                    setMessage('Your team\'s guide has been finalized by the admin.');
                } else if (periodEnded) {
                    setError('The guide assignment period has ended. You can no longer select a guide.');
                }


            } catch (err) {
                console.error('Error fetching initial data for guide selection:', err);
                setError(err.response?.data?.message || 'Failed to load guide selection options.');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [navigate]);

    const handleGuideSelection = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!selectedGuideId) {
            setError('Please select a guide.');
            return;
        }
        if (!teamInfo || !teamInfo._id) {
            setError('Team information not available. Cannot send request.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5000/api/team/request-guide/${teamInfo._id}`, {
                guideId: selectedGuideId
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage(res.data.message);
            // Update team info locally to reflect pending status
            setTeamInfo(prev => ({
                ...prev,
                guidePreference: {
                    guideId: { _id: selectedGuideId, username: availableGuides.find(g => g._id === selectedGuideId)?.username },
                    status: 'pending',
                    requestedAt: new Date().toISOString()
                }
            }));
            setSelectedGuideId(''); // Clear selection after sending
            setAvailableGuides([]); // Clear available guides as a request has been sent
        } catch (err) {
            console.error('Error sending guide request:', err.response?.data || err);
            setError(err.response?.data?.message || 'Failed to send guide request.');
        }
    };

    const renderGuideStatus = () => {
        if (!teamInfo || !teamInfo.guidePreference) return null;

        const { guidePreference, isGuideFinalized } = teamInfo;
        const periodEnded = guideAssignmentPeriodEnd && new Date() > new Date(guideAssignmentPeriodEnd);

        if (isGuideFinalized) {
            return (
                <p className="success-message">
                    Your team's guide has been finalized by the admin.
                    Guide: {guidePreference.guideId?.username || 'N/A'} (Status: {guidePreference.status})
                </p>
            );
        }

        switch (guidePreference.status) {
            case 'pending':
                return (
                    <p className="info-message">
                        Your request to {guidePreference.guideId?.username || 'the selected guide'} is pending approval.
                        Please wait for the guide to respond.
                    </p>
                );
            case 'accepted':
                return (
                    <p className="success-message">
                        Congratulations! Your guide, {guidePreference.guideId?.username || 'N/A'}, has accepted your request.
                    </p>
                );
            case 'rejected':
                return (
                    <p className="error-message">
                        Your guide request to {guidePreference.guideId?.username || 'a faculty'} was rejected.
                        You can now select another guide.
                    </p>
                );
            case 'none':
                if (periodEnded) {
                     return (
                        <p className="error-message">
                            The guide assignment period has ended, and your team does not have an assigned guide.
                        </p>
                    );
                }
                return (
                    <p className="info-message">
                        You have not yet requested a guide. Please select one below.
                    </p>
                );
            default:
                return null;
        }
    };

    const isGuideSelectionDisabled = () => {
        if (loading || !teamInfo || !teamInfo.isTeamLeader || teamInfo.status !== 'approved' || teamInfo.isGuideFinalized) {
            return true;
        }
        // If period ended, disable selection
        if (guideAssignmentPeriodEnd && new Date() > new Date(guideAssignmentPeriodEnd)) {
            return true;
        }
        // Disable if status is pending or accepted (unless it was rejected)
        const { guidePreference } = teamInfo;
        return guidePreference.status === 'pending' || guidePreference.status === 'accepted';
    };

    const periodEndDate = guideAssignmentPeriodEnd ? new Date(guideAssignmentPeriodEnd).toLocaleDateString() : 'Not Set';
    const periodHasEnded = guideAssignmentPeriodEnd && new Date() > new Date(guideAssignmentPeriodEnd);

    if (loading) {
        return <div className="auth-container"><p>Loading guide selection options...</p></div>;
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Guide Selection</h2>
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                {teamInfo && teamInfo.teamLeader && (
                    <p className="info-message">
                        <strong>Team Leader:</strong> {teamInfo.teamLeader.username} (You are {teamInfo.isTeamLeader ? 'the leader' : 'a member'})
                    </p>
                )}
                {teamInfo && teamInfo.status !== 'approved' && (
                    <p className="error-message">Your team status is currently "{teamInfo.status}". Guide selection is only available for approved teams.</p>
                )}

                {guideAssignmentPeriodEnd && (
                    <p className={periodHasEnded ? "error-message" : "info-message"}>
                        Guide selection period ends on: <strong>{periodEndDate}</strong>.
                        {periodHasEnded && " The period has ended."}
                    </p>
                )}

                {renderGuideStatus()}

                {teamInfo && teamInfo.isTeamLeader && teamInfo.status === 'approved' && !teamInfo.isGuideFinalized && !periodHasEnded && (teamInfo.guidePreference.status === 'none' || teamInfo.guidePreference.status === 'rejected') && (
                    <form onSubmit={handleGuideSelection}>
                        <div className="form-group">
                            <label htmlFor="guide">Select a Guide:</label>
                            <select
                                id="guide"
                                className="form-control"
                                value={selectedGuideId}
                                onChange={(e) => setSelectedGuideId(e.target.value)}
                                disabled={isGuideSelectionDisabled()}
                                required
                            >
                                <option value="">-- Select a Guide --</option>
                                {availableGuides.map((guide) => (
                                    <option key={guide._id} value={guide._id}>
                                        {guide.username}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button type="submit" className="auth-button" disabled={isGuideSelectionDisabled()}>
                            Request Guide
                        </button>
                    </form>
                )}

                {teamInfo && !teamInfo.isTeamLeader && (
                    <p className="info-message">Only the team leader can perform guide selection.</p>
                )}

            </div>
        </div>
    );
};

export default GuideSelection;