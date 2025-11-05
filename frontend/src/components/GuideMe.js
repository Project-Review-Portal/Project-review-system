import React from 'react';
import Credits from './Credits';

const GuideMe = ({ userRole, memberType }) => {
    const getGuideContent = () => {
        switch (userRole) {
            case 'admin':
                return {
                    title: "Admin Dashboard Guide",
                    sections: [
                        {
                            title: "User Management",
                            description: "Manage all users in the system",
                            features: [
                                "View all registered users",
                                "Create new users",
                                "Update user information",
                                "Assign roles and permissions"
                            ]
                        },
                        {
                            title: "Team Management",
                            description: "Oversee team formation and assignments",
                            features: [
                                "View all teams",
                                "Approve/reject team formations",
                                "Monitor team status",
                                "Manage team assignments"
                            ]
                        },
                        {
                            title: "Panel Management",
                            description: "Create and manage review panels",
                            features: [
                                "Create new panels",
                                "Assign panel members",
                                "Manage panel assignments",
                                "View panel statistics"
                            ]
                        },
                        {
                            title: "Guide Assignment",
                            description: "Manage guide assignments to teams",
                            features: [
                                "View guide requests",
                                "Assign guides to teams",
                                "Monitor guide assignments",
                                "Generate assignment reports"
                            ]
                        },
                        {
                            title: "Review Scheduling",
                            description: "Manage review schedules and periods",
                            features: [
                                "Set review periods",
                                "Schedule team reviews",
                                "Manage review venues",
                                "Track review progress"
                            ]
                        },
                        {
                            title: "System Configuration",
                            description: "Configure system settings",
                            features: [
                                "Set team size limits",
                                "Configure review periods",
                                "Manage system rules",
                                "View system statistics"
                            ]
                        }
                    ]
                };

            case 'student':
                return {
                    title: "Student Dashboard Guide",
                    sections: [
                        {
                            title: "Team Formation",
                            description: "Form your project team",
                            features: [
                                "Create a new team",
                                "Invite team members",
                                "View team status",
                                "Manage team composition"
                            ]
                        },
                        {
                            title: "Guide Selection",
                            description: "Request a project guide",
                            features: [
                                "View available guides",
                                "Submit guide requests",
                                "Track request status",
                                "View assigned guide"
                            ]
                        },
                        {
                            title: "Panel Information",
                            description: "View your assigned panel",
                            features: [
                                "See panel members",
                                "View panel details",
                                "Check review schedule",
                                "Access panel feedback"
                            ]
                        },
                        {
                            title: "Review Schedule",
                            description: "Track your review schedule",
                            features: [
                                "View review dates",
                                "Check venue information",
                                "See review requirements",
                                "Access review materials"
                            ]
                        },
                        {
                            title: "Final Report",
                            description: "Submit your final report",
                            features: [
                                "Upload project documents",
                                "Submit final report",
                                "Track submission status",
                                "View feedback"
                            ]
                        }
                    ]
                };

            case 'guide':
                return {
                    title: "Guide Dashboard Guide",
                    sections: [
                        {
                            title: "Guide Requests",
                            description: "Manage team requests for guidance",
                            features: [
                                "View pending requests",
                                "Accept/reject requests",
                                "Manage current teams",
                                "Track request history"
                            ]
                        },
                        {
                            title: "My Teams",
                            description: "Manage your assigned teams",
                            features: [
                                "View all assigned teams",
                                "Track team progress",
                                "Provide guidance",
                                "Monitor team status"
                            ]
                        },
                        {
                            title: "Review Schedules",
                            description: "Manage review schedules",
                            features: [
                                "View review schedules",
                                "Set availability",
                                "Coordinate with panels",
                                "Track review progress"
                            ]
                        },
                        {
                            title: "Marking & Evaluation",
                            description: "Evaluate team performance",
                            features: [
                                "Grade team submissions",
                                "Provide feedback",
                                "Submit evaluations",
                                "Track marking progress"
                            ]
                        },
                        {
                            title: "Attendance",
                            description: "Manage attendance records",
                            features: [
                                "Mark attendance",
                                "View attendance reports",
                                "Track participation",
                                "Generate reports"
                            ]
                        }
                    ]
                };

            case 'panel':
                return {
                    title: "Panel Member Dashboard Guide",
                    sections: [
                        {
                            title: "Assigned Teams",
                            description: "View teams assigned to your panel",
                            features: [
                                "See all assigned teams",
                                "View team details",
                                "Check team status",
                                "Access team information"
                            ]
                        },
                        {
                            title: "Assigned Reviews",
                            description: "Manage your review assignments",
                            features: [
                                "View review schedule",
                                "See team details",
                                "Track review progress",
                                "Access review materials"
                            ]
                        },
                        {
                            title: "Review Schedules",
                            description: "Manage your review schedule",
                            features: [
                                "View scheduled reviews",
                                "Set availability",
                                "Coordinate with teams",
                                "Track review dates"
                            ]
                        },
                        {
                            title: "Marking & Evaluation",
                            description: "Evaluate team performance",
                            features: [
                                "Grade team presentations",
                                "Provide feedback",
                                "Submit evaluations",
                                "Track marking progress"
                            ]
                        }
                    ]
                };

            case 'coordinator':
                return {
                    title: "Coordinator Dashboard Guide",
                    sections: [
                        {
                            title: "Review Schedule Management",
                            description: "Manage review schedules for all teams",
                            features: [
                                "Create review schedules",
                                "Assign venues and times",
                                "Coordinate with panels",
                                "Track schedule status"
                            ]
                        },
                        {
                            title: "Viva Schedule Management",
                            description: "Manage viva voce schedules",
                            features: [
                                "Schedule viva sessions",
                                "Assign external examiners",
                                "Coordinate venues",
                                "Track viva progress"
                            ]
                        },
                        {
                            title: "Document Generation",
                            description: "Generate official documents",
                            features: [
                                "Create letters and forms",
                                "Generate certificates",
                                "Print official documents",
                                "Manage document templates"
                            ]
                        },
                        {
                            title: "Letter Generation",
                            description: "Generate official letters",
                            features: [
                                "Create external examiner letters",
                                "Generate chairman letters",
                                "Customize letter content",
                                "Download filled letters"
                            ]
                        }
                    ]
                };

            default:
                return {
                    title: "Dashboard Guide",
                    sections: [
                        {
                            title: "Getting Started",
                            description: "Welcome to the system",
                            features: [
                                "Explore your dashboard",
                                "Check your permissions",
                                "View available features",
                                "Contact support if needed"
                            ]
                        }
                    ]
                };
        }
    };

    const guideContent = getGuideContent();

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{guideContent.title}</h2>
                <p className="text-gray-600">
                    Welcome! This guide will help you understand the features available in your dashboard.
                </p>
            </div>

            <div className="space-y-6">
                {guideContent.sections.map((section, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {section.title}
                        </h3>
                        <p className="text-gray-600 mb-3">{section.description}</p>
                        <div className="space-y-2">
                            {section.features.map((feature, featureIndex) => (
                                <div key={featureIndex} className="flex items-start">
                                    <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="ml-3 text-sm text-gray-700">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h4>
                <p className="text-blue-700 text-sm">
                    If you need assistance with any feature or encounter any issues, please contact the system administrator or your department coordinator.
                </p>
            </div>
            <Credits />
        </div>
    );
};

export default GuideMe; 