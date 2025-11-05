import React from 'react';

const Credits = () => {
    const teamMembers = [
        {
            name: "Roopa Varshni R",
            rollNumber: "2023103509",
            role: "Team Lead",
            image: "/images/roopa_pic.png"
        },
        {
            name: "Rohini C G",
            rollNumber: "2023103530",
            role: "Team Member",
            image: "/images/rohini_pic.jpg"
        },
        {
            name: "Suchitra S",
            rollNumber: "2023103590",
            role: "Team Member",
            image: "/images/suchitra_pic.jpg"
        },
        {
            name: "Vedanth Parthasarathy",
            rollNumber: "2023103625",
            role: "Team Member",
            image: "/images/vedanth_pic.jpg"
        }
    ];

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Development Team</h2>
                <p className="text-gray-600">
                    This project was developed by the following team members.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {teamMembers.map((member, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="mb-4">
                            <img
                                src={member.image}
                                alt={member.name}
                                className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-blue-200"
                                onError={(e) => {
                                    e.target.src = '/images/default-avatar.png';
                                }}
                            />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {member.name}
                        </h3>
                        <p className="text-sm text-blue-600 font-medium mb-1">
                            {member.role}
                        </p>
                        <p className="text-sm text-gray-600">
                            {member.rollNumber}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Credits; 