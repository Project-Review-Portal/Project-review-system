const Panel = require('../models/Panel');
const MarkingScheme = require('../models/MarkingScheme');
const { getReviewSettings } = require('../utils/reviewSettings');

/**
 * GET /api/marking-scheme/coordinator?panelId=&slotType=&evaluatorType=
 * Fetch the marking scheme for a panel + slotType + evaluatorType (coordinator / asst coord only).
 */
exports.getSchemeForCoordinator = async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const { panelId, slotType } = req.query;
        const evaluatorType = req.query.evaluatorType === 'guide' ? 'guide' : 'panel';

        if (!panelId || !slotType) {
            return res.status(400).json({ message: 'panelId and slotType are required.' });
        }

        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        // Verify caller coordinates this panel
        const panel = await Panel.findOne({
            _id: panelId,
            $or: [
                { coordinator: coordinatorId },
                { assistantCoordinators: coordinatorId }
            ],
            ...sessionFilter
        });
        if (!panel) {
            return res.status(403).json({ message: 'You do not coordinate this panel.' });
        }

        let scheme = await MarkingScheme.findOne({ panel: panelId, slotType, evaluatorType, ...sessionFilter });
        if (!scheme && req.sessionId) {
            scheme = await MarkingScheme.findOne({ panel: panelId, slotType, evaluatorType });
        }
        res.json(scheme || { panel: panelId, slotType, evaluatorType, components: [] });
    } catch (err) {
        console.error('Error fetching marking scheme (coordinator):', err);
        res.status(500).json({ message: 'Server error fetching marking scheme.' });
    }
};

/**
 * POST /api/marking-scheme/coordinator
 * Create or update a marking scheme for a panel + slotType + evaluatorType.
 * Body: { panelId, slotType, evaluatorType, components: [{ name, maxMarks }] }
 */
exports.saveSchemeForCoordinator = async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const { panelId, slotType, components } = req.body;
        const evaluatorType = req.body.evaluatorType === 'guide' ? 'guide' : 'panel';

        if (!panelId || !slotType) {
            return res.status(400).json({ message: 'panelId and slotType are required.' });
        }

        if (!Array.isArray(components) || components.length === 0) {
            return res.status(400).json({ message: 'At least one component is required.' });
        }

        // Validate each component
        for (const c of components) {
            if (!c.name || typeof c.name !== 'string' || !c.name.trim()) {
                return res.status(400).json({ message: 'Each component must have a name.' });
            }
            if (typeof c.maxMarks !== 'number' || c.maxMarks <= 0) {
                return res.status(400).json({ message: `Component "${c.name}" must have a positive maxMarks.` });
            }
        }

        // Validate slotType
        const programme = req.headers['x-selected-programme'];
        const { validSlotTypes } = await getReviewSettings(programme, req.sessionId);
        if (!validSlotTypes.includes(slotType)) {
            return res.status(400).json({ message: `Invalid slotType "${slotType}".` });
        }

        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        // Verify coordinator owns this panel
        const panel = await Panel.findOne({
            _id: panelId,
            $or: [
                { coordinator: coordinatorId },
                { assistantCoordinators: coordinatorId }
            ],
            ...sessionFilter
        });
        if (!panel) {
            return res.status(403).json({ message: 'You do not coordinate this panel.' });
        }

        const cleanedComponents = components.map(c => ({
            name: c.name.trim(),
            maxMarks: Number(c.maxMarks)
        }));

        const targetSession = req.sessionId || panel.session;

        const scheme = await MarkingScheme.findOneAndUpdate(
            { 
                panel: panelId, 
                slotType, 
                evaluatorType,
                ...(targetSession ? { session: targetSession } : {})
            },
            {
                panel: panelId,
                slotType,
                evaluatorType,
                programme: panel.programme,
                components: cleanedComponents,
                createdBy: coordinatorId,
                ...(targetSession ? { session: targetSession } : {}),
                updatedAt: Date.now()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ message: 'Marking scheme saved successfully.', scheme });
    } catch (err) {
        console.error('Error saving marking scheme:', err);
        res.status(500).json({ message: err.message || 'Server error saving marking scheme.' });
    }
};

/**
 * GET /api/marking-scheme/for-panel?panelId=&slotType=&evaluatorType=
 * Fetch a marking scheme for any authenticated user (guide/panel member) to read.
 */
exports.getSchemePublic = async (req, res) => {
    try {
        const { panelId, slotType } = req.query;
        const evaluatorType = req.query.evaluatorType === 'guide' ? 'guide' : 'panel';

        if (!panelId || !slotType) {
            return res.status(400).json({ message: 'panelId and slotType are required.' });
        }

        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};
        let scheme = await MarkingScheme.findOne({ panel: panelId, slotType, evaluatorType, ...sessionFilter });
        if (!scheme && req.sessionId) {
            scheme = await MarkingScheme.findOne({ panel: panelId, slotType, evaluatorType });
        }
        res.json(scheme || { panel: panelId, slotType, evaluatorType, components: [] });
    } catch (err) {
        console.error('Error fetching marking scheme (public):', err);
        res.status(500).json({ message: 'Server error fetching marking scheme.' });
    }
};

/**
 * GET /api/marking-scheme/coordinator/my-panels
 * Returns panels filtered by X-Selected-Role, X-Selected-Programme, and Session
 */
exports.getMyPanels = async (req, res) => {
    try {
        const coordinatorId = req.user.id;
        const selectedRole      = (req.headers['x-selected-role']      || '').trim();
        const selectedProgramme = (req.headers['x-selected-programme'] || '').trim();

        // Role-based coordinator field to query
        const roleMatch = selectedRole === 'assistant coordinator'
            ? { assistantCoordinators: coordinatorId }
            : { $or: [{ coordinator: coordinatorId }, { assistantCoordinators: coordinatorId }] };

        // Case-insensitive programme filter — only applied when a value is present
        const progFilter = selectedProgramme
            ? { programme: { $regex: new RegExp(`^${selectedProgramme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
            : {};

        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        const finalQuery = {
            ...roleMatch,
            ...progFilter,
            ...sessionFilter
        };

        const panels = await Panel.find(finalQuery).select('_id name panelType programme session');
        res.json(panels);
    } catch (err) {
        console.error('Error fetching coordinator panels:', err);
        res.status(500).json({ message: 'Server error fetching panels.' });
    }
};
