import { useState, useEffect } from 'react';
import axios from 'axios';

const SERVER_API_KEY = process.env.REACT_APP_SERVER_API_KEY || "http://localhost:3626";

export const useReviewCycle = (programme, teamId) => {
    const [cycleData, setCycleData] = useState({
        current: 0,
        scores: [],
        stageNames: ['Review 0', 'Review 1', 'Review 2', 'Review 3', 'Viva'],
        loading: true,
        error: null
    });

    useEffect(() => {
        let isMounted = true;
        const fetchCycle = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const params = new URLSearchParams();
                if (programme) params.append('programme', programme);
                if (teamId) params.append('teamId', teamId);

                const res = await axios.get(`${SERVER_API_KEY}/api/teams/review-cycle?${params.toString()}`, { headers });
                if (isMounted && res.data) {
                    setCycleData({
                        current: res.data.current ?? 0,
                        scores: res.data.scores || [],
                        stageNames: res.data.stageNames || ['Review 0', 'Review 1', 'Review 2', 'Review 3', 'Viva'],
                        loading: false,
                        error: null
                    });
                }
            } catch (err) {
                if (isMounted) {
                    setCycleData(prev => ({ ...prev, loading: false, error: 'Failed to load review cycle' }));
                }
            }
        };

        fetchCycle();

        return () => {
            isMounted = false;
        };
    }, [programme, teamId]);

    return cycleData;
};
