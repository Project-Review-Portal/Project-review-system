import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/GuideSelection.css'; // Import new CSS

const GuideSelection = () => {
    const [guides, setGuides] = useState([]);
    const [selectedGuide, setSelectedGuide] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [teamInfo, setTeamInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setMessage('Authentication required.');
                    setMessageType('error');
                    return;
                }

                // First fetch team info
                const teamRes = await axios.get('http://localhost:5000/api/team/my-team', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTeamInfo(teamRes.data);

                // Then fetch available guides
                const guidesRes = await axios.get('http://localhost:5000/api/team/guides', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setGuides(guidesRes.data);
                
                if (guidesRes.data.length > 0) {
                    setSelectedGuide(guidesRes.data[0]._id);
                }
            } catch (error) {
                console.error('Error fetching data:', error.response?.data || error.message);
                setMessage('Failed to load data.');
                setMessageType('error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!selectedGuide) {
            setMessage('Please select a guide.');
            setMessageType('error');
            return;
        }

        if (!teamInfo || !teamInfo._id) {
            setMessage('Team information not available.');
            setMessageType('error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await axios.put(
                `http://localhost:5000/api/team/request-guide/${teamInfo._id}`,
                { guideId: selectedGuide },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(response.data.message || 'Guide request sent successfully!');
            setMessageType('success');
            
            // Update team info to reflect the pending request
            setTeamInfo(prev => ({
                ...prev,
                guidePreference: {
                    guideId: { _id: selectedGuide, username: guides.find(g => g._id === selectedGuide)?.username },
                    status: 'pending',
                    requestedAt: new Date().toISOString()
                }
            }));
        } catch (error) {
            console.error('Error selecting guide:', error.response?.data || error.message);
            setMessage(error.response?.data?.message || 'Failed to select guide.');
            setMessageType('error');
        }
    };

    if (loading) {
        return <div className="guide-selection-container"><p>Loading...</p></div>;
    }

    if (!teamInfo) {
        return <div className="guide-selection-container"><p>You are not part of any team.</p></div>;
    }

    if (teamInfo.status !== 'approved') {
        return <div className="guide-selection-container"><p>Your team must be approved before you can select a guide.</p></div>;
    }

    if (teamInfo.guidePreference?.status === 'pending') {
        return <div className="guide-selection-container"><p>Your guide request is pending approval.</p></div>;
    }

    if (teamInfo.guidePreference?.status === 'accepted') {
        return <div className="guide-selection-container"><p>Your guide has been assigned: {teamInfo.guidePreference.guideId.username}</p></div>;
    }

    return (
        <div className="guide-selection-container">
            <h2>Select Your Project Guide</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="guide-select">Choose a Guide:</label>
                    <select
                        id="guide-select"
                        value={selectedGuide}
                        onChange={(e) => setSelectedGuide(e.target.value)}
                        required
                    >
                        <option value="">-- Select a Guide --</option>
                        {guides.map((guide) => (
                            <option key={guide._id} value={guide._id}>
                                {guide.username}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit">Request Guide</button>
                {message && <p className={`message ${messageType}`}>{message}</p>}
            </form>
        </div>
    );
};

export default GuideSelection;