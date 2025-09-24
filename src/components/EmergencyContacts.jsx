import React from 'react';

const emergencyContacts = [
  { name: 'NDRF Team', number: '1078', description: 'National Disaster Response Force' },
  { name: 'Fire Emergency', number: '101', description: 'Fire and Rescue Services' },
  { name: 'Flood Helpline', number: '1070', description: '24/7 Flood Emergency Support' },
  { name: 'Police', number: '100', description: 'Emergency Police Services' },
];

export default function EmergencyContacts() {
  const handleCall = (number) => {
    window.open(`tel:${number}`, '_self');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Emergency Contacts
      </h3>
      <div className="space-y-3">
        {emergencyContacts.map((contact, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="font-medium text-gray-900">{contact.name}</span>
                <span className="ml-2 text-sm text-gray-500">({contact.description})</span>
              </div>
              <div className="text-lg font-bold text-blue-600 mt-1">{contact.number}</div>
            </div>
            <button
              onClick={() => handleCall(contact.number)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Call</span>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> These are 24/7 emergency helplines. Use them only in genuine emergencies.
        </p>
      </div>
    </div>
  );
}
