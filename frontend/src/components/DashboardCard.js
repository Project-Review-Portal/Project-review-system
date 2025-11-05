import React from 'react';
import { Link } from 'react-router-dom';

const DashboardCard = ({ title, description, link }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 transform transition duration-300 hover:scale-105">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
            <Link to={link} className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200">
                Go to {title}
            </Link>
        </div>
    );
};

export default DashboardCard; 