const TeamPanelAssignment = require('../models/TeamPanelAssignment');
const Panel = require('../models/Panel');
const Team = require('../models/Team');
const mongoose = require('mongoose');

// Get all panel assignments
exports.getAllAssignments = async (req, res) => {
    try {
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};
        const assignments = await TeamPanelAssignment.find(sessionFilter)
            .populate('panel', 'name members')
            .populate({
                path: 'teams',
                populate: [
                    { path: 'members', select: 'username name' },
                    { path: 'teamLeader', select: 'username name' }
                ]
            });
        res.json(assignments);
    } catch (error) {
        console.error('Error fetching panel assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Auto-assign panels to all unassigned approved teams
exports.autoAssignPanels = async (req, res) => {
    try {
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        // Get all approved teams with no panel assigned in current session
        const teams = await Team.find({ panel: null, status: 'approved', ...sessionFilter })
            .populate('guidePreference', 'username name _id');

        if (!teams || teams.length === 0) {
            return res.json({ message: 'No unassigned approved teams found', assignedCount: 0, skipped: [] });
        }

        // Get all panels with members and coordinator in current session
        const panels = await Panel.find(sessionFilter)
            .populate('members', 'username name _id')
            .populate('coordinator', 'username name _id');

        // Build current team counts per panel using aggregation scoped to session
        const sessionMatch = req.sessionId ? { session: new mongoose.Types.ObjectId(req.sessionId) } : {};
        const countsAgg = await Team.aggregate([
            { $match: { panel: { $ne: null }, ...sessionMatch } },
            { $group: { _id: '$panel', count: { $sum: 1 } } }
        ]);
        const panelCountMap = new Map(countsAgg.map(c => [String(c._id), c.count]));

        const assignmentsMade = [];
        const skipped = [];

        for (const team of teams) {
            // Determine available panels for this team (no guide conflict)
            const availablePanels = panels.filter(panel => {
                if (!team.guidePreference) return true; // no guide set => no conflict
                const gid = String(team.guidePreference._id);
                const isMember = Array.isArray(panel.members) && panel.members.some(m => String(m._id) === gid);
                const isCoordinator = panel.coordinator && String(panel.coordinator._id) === gid;
                return !isMember && !isCoordinator;
            });

            if (availablePanels.length === 0) {
                skipped.push({ teamId: team._id, reason: 'No available panel (guide conflict)' });
                continue;
            }

            // Pick panel with fewest teams, tie-breaker by name
            availablePanels.sort((a, b) => {
                const ca = panelCountMap.get(String(a._id)) || 0;
                const cb = panelCountMap.get(String(b._id)) || 0;
                if (ca !== cb) return ca - cb;
                return (a.name || '').localeCompare(b.name || '');
            });
            const chosen = availablePanels[0];

            // Assign chosen panel to team
            team.panel = chosen._id;
            team.coordinator = chosen.coordinator || null;
            await team.save();

            // Update TeamPanelAssignment mapping
            let assignment = await TeamPanelAssignment.findOne({ panel: chosen._id, ...sessionFilter });
            if (assignment) {
                const exists = assignment.teams.some(tid => String(tid) === String(team._id));
                if (!exists) {
                    assignment.teams.push(team._id);
                    await assignment.save();
                }
            } else {
                assignment = new TeamPanelAssignment({ 
                    panel: chosen._id, 
                    teams: [team._id],
                    session: req.sessionId || team.session || null
                });
                await assignment.save();
            }

            // Update count map
            const key = String(chosen._id);
            panelCountMap.set(key, (panelCountMap.get(key) || 0) + 1);

            assignmentsMade.push({ teamId: team._id, panelId: chosen._id });
        }

        return res.json({
            message: 'Auto-assign completed',
            assignedCount: assignmentsMade.length,
            assigned: assignmentsMade,
            skipped
        });
    } catch (error) {
        console.error('Error auto-assigning panels:', error);
        res.status(500).json({ message: 'Server error during auto-assign' });
    }
};

// Get all panels and teams for assignment
exports.getPanelsAndTeams = async (req, res) => {
    try {
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};

        // Populate members to get username, name, and memberType for display
        const panels = await Panel.find(sessionFilter).populate('members', 'username name memberType');
        let teams = await Team.find(sessionFilter)
            .populate('members', 'username name')
            .populate('teamLeader', 'username name')
            .populate('guidePreference', 'username name');
        
        // Only include formed teams: must have a leader and at least one member
        teams = teams.filter(team => team.teamLeader && Array.isArray(team.members) && team.members.length > 0);

        res.json({ panels, teams });
    } catch (error) {
        console.error('Error fetching panels and teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create panel assignments
exports.createAssignments = async (req, res) => {
    try {
        const { assignments } = req.body; // Array of { panelId, teamIds }
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};
        
        // Clear existing assignments for THIS session only
        await TeamPanelAssignment.deleteMany(sessionFilter);

        // Clear panel assignments from teams for THIS session only
        await Team.updateMany(sessionFilter, { $unset: { panel: 1 } });
        
        // Create new assignments and update teams
        const newAssignments = await Promise.all(
            assignments.map(async ({ panelId, teamIds }) => {
                const assignment = new TeamPanelAssignment({
                    panel: panelId,
                    teams: teamIds,
                    session: req.sessionId || null
                });
                await assignment.save();

                // Get the panel to access its coordinator
                const panel = await Panel.findById(panelId);
                
                // Update each team with the assigned panel and coordinator
                await Team.updateMany(
                    { _id: { $in: teamIds } },
                    { $set: { panel: panelId, coordinator: panel ? panel.coordinator : null } }
                );

                return assignment;
            })
        );
        
        res.status(201).json({ 
            message: 'Panel assignments created successfully!',
            assignments: newAssignments
        });
    } catch (error) {
        console.error('Error creating panel assignments:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get teams without panels for manual assignment
exports.getUnassignedTeams = async (req, res) => {
    try {
        const sessionFilter = req.sessionId ? { session: req.sessionId } : {};
        const teams = await Team.find({ 
            panel: null,
            status: 'approved',
            ...sessionFilter
        })
        .populate('teamLeader', 'username name')
        .populate('members', 'username name')
        .populate('guidePreference', 'username name');
        
        res.json(teams);
    } catch (error) {
        console.error('Error fetching unassigned teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get available panels for a specific team (with conflict checking)
exports.getAvailablePanelsForTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        
        // Get the team with its guide
        const team = await Team.findById(teamId)
            .populate('guidePreference', 'username name _id');
        
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        // Get all panels within the same session
        const sessionFilter = req.sessionId ? { session: req.sessionId } : (team?.session ? { session: team.session } : {});
        const allPanels = await Panel.find(sessionFilter)
            .populate('members', 'username name _id')
            .populate('coordinator', 'username name _id');
        
        // Filter panels to exclude those with conflicts
        const availablePanels = allPanels.filter(panel => {
            if (!team.guidePreference) return true;
            // Check if team's guide is in the panel
            const guideInPanel = panel.members.some(member => 
                member._id.toString() === team.guidePreference._id.toString()
            );
            
            // Check if team's guide is the panel coordinator
            const guideIsCoordinator = panel.coordinator && 
                panel.coordinator._id.toString() === team.guidePreference._id.toString();
            
            // Panel is available if guide is not in panel and not coordinator
            return !guideInPanel && !guideIsCoordinator;
        });
        
        res.json(availablePanels);
    } catch (error) {
        console.error('Error fetching available panels for team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Assign a panel to a team manually
exports.assignPanelToTeam = async (req, res) => {
    try {
        const { teamId, panelId } = req.body;
        
        // Validate team exists
        const team = await Team.findById(teamId)
            .populate('guidePreference', 'username name _id');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        // Check whether the team has already assigned a panel
        const isSamePanel = team.panel && team.panel.toString() === panelId;
        if(isSamePanel){
            return res.status(404).json({ message: 'Assigning the same panel' });
        }

        // Validate panel exists
        const panel = await Panel.findById(panelId)
            .populate('members', 'username name _id')
            .populate('coordinator', 'username name _id');
        
        if (!panel) {
            return res.status(404).json({ message: 'Panel not found' });
        }
        
        // Check for conflicts
        if (team.guidePreference) {
            const guideInPanel = panel.members.some(member => 
                member._id.toString() === team.guidePreference._id.toString()
            );
            
            const guideIsCoordinator = panel.coordinator && 
                panel.coordinator._id.toString() === team.guidePreference._id.toString();
            
            if (guideInPanel || guideIsCoordinator) {
                return res.status(400).json({ 
                    message: 'Cannot assign panel: Team guide is already a member or coordinator of this panel' 
                });
            }
        }

        const sessionFilter = req.sessionId ? { session: req.sessionId } : (team?.session ? { session: team.session } : {});

        // Pull the team from any existing panel assignments for this session first
        await TeamPanelAssignment.updateMany(sessionFilter, { $pull: { teams: teamId } });

        // Assign panel and coordinator to team
        team.panel = panelId;
        team.coordinator = panel.coordinator;
        await team.save();
        
        // Check if there's an existing assignment for this panel in this session
        let assignment = await TeamPanelAssignment.findOne({ panel: panelId, ...sessionFilter });
        
        if (assignment) {
            // Add team to existing assignment
            if (!assignment.teams.includes(teamId)) {
                assignment.teams.push(teamId);
                await assignment.save();
            }
        } else {
            // Create new assignment
            assignment = new TeamPanelAssignment({
                panel: panelId,
                teams: [teamId],
                session: req.sessionId || team.session || null
            });
            await assignment.save();
        }
        
        res.json({ 
            message: 'Panel assigned to team successfully!',
            team: team,
            panel: panel
        });
    } catch (error) {
        console.error('Error assigning panel to team:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Remove panel assignment from a team
exports.removePanelFromTeam = async (req, res) => {
    try {
        const { teamId } = req.body;
        
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        if (!team.panel) {
            return res.status(400).json({ message: 'Team has no panel assigned' });
        }
        
        const oldPanelId = team.panel;

        // Remove panel and coordinator from team
        team.panel = null;
        team.coordinator = null;
        await team.save();
        
        const sessionFilter = req.sessionId ? { session: req.sessionId } : (team?.session ? { session: team.session } : {});

        // Update or remove assignment
        const assignment = await TeamPanelAssignment.findOne({ panel: oldPanelId, ...sessionFilter });
        if (assignment) {
            assignment.teams = assignment.teams.filter(id => id.toString() !== teamId);
            if (assignment.teams.length === 0) {
                await TeamPanelAssignment.findByIdAndDelete(assignment._id);
            } else {
                await assignment.save();
            }
        }
        
        res.json({ message: 'Panel removed from team successfully!' });
    } catch (error) {
        console.error('Error removing panel from team:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 