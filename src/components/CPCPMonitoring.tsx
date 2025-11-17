import React, { useState } from 'react';
import { ArrowLeft, Printer, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { AddInspectionModal } from './AddInspectionModal';

interface CPCPMonitoringProps {
  onBack: () => void;
  msn: string;
}

interface InspectionItem {
  id: number;
  remaining: {
    months: number | string;
    days: number | string;
    tech: number | string;
    aftf: number | string;
  };
  inspectionCode: string;
  description: string;
  interval: {
    hours: number | string;
    months: number | string;
    tech: number | string;
    aftf: number | string;
  };
  lastDone: {
    date: string;
    tech: number | string;
    aftf: number | string;
  };
  nextDue: {
    date: string;
    tech: number | string;
    aftf: number | string;
  };
  reference: string;
  status: 'green' | 'yellow' | 'red' | 'white';
}

export function CPCPMonitoring({ onBack, msn }: CPCPMonitoringProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);

  // Sample inspection data
  const inspectionData: InspectionItem[] = [
    {
      id: 1,
      remaining: { months: '70.97', days: '214', tech: '95.7', aftf: '95.7' },
      inspectionCode: 'IO 1',
      description: 'Records Inspection',
      interval: { hours: '100', months: '12', tech: '7955.5', aftf: '7691.1' },
      lastDone: { date: '7-September-2024', tech: '7955.5', aftf: '7691.1' },
      nextDue: { date: '16-Sep-2026', tech: '7955.5', aftf: '7691.1' },
      reference: '16-Sep-2026',
      status: 'white'
    },
    {
      id: 2,
      remaining: { months: '2.25', days: '216', tech: '-', aftf: '-' },
      inspectionCode: 'IO 2',
      description: 'Baseline Program',
      interval: { hours: '-', months: '12', tech: '-', aftf: '7684.1' },
      lastDone: { date: '29-May-2024', tech: '-', aftf: '7684.1' },
      nextDue: { date: '29-May-2026', tech: '-', aftf: '-' },
      reference: '29-May-2026',
      status: 'white'
    },
    {
      id: 3,
      remaining: { months: '-', days: '-', tech: '-', aftf: '-' },
      inspectionCode: 'IO 3',
      description: 'Baseline Program',
      interval: { hours: '-', months: '24', tech: '-', aftf: '-' },
      lastDone: { date: '31-Jan-2025', tech: '-', aftf: '-' },
      nextDue: { date: '31-Jan-2027', tech: '-', aftf: '-' },
      reference: '31-Jan-2027',
      status: 'white'
    },
    {
      id: 4,
      remaining: { months: '-', days: '-', tech: '-', aftf: '-' },
      inspectionCode: 'IO 4',
      description: 'Baseline Program',
      interval: { hours: '-', months: '36', tech: '-', aftf: '6098.4' },
      lastDone: { date: '31-Jan-2025', tech: '-', aftf: '-' },
      nextDue: { date: '1-Jan-2028', tech: '-', aftf: '-' },
      reference: '1-Jan-2028',
      status: 'red'
    },
    {
      id: 5,
      remaining: { months: '-', days: '-', tech: '-', aftf: '-' },
      inspectionCode: 'IO 5',
      description: 'Baseline Program',
      interval: { hours: '-', months: '48', tech: '-', aftf: '6098.4' },
      lastDone: { date: '31-Jan-2025', tech: '-', aftf: '-' },
      nextDue: { date: '1-Jan-2029', tech: '-', aftf: '-' },
      reference: '1-Jan-2029',
      status: 'red'
    },
    {
      id: 6,
      remaining: { months: '-31.37', days: '905', tech: '-', aftf: '-' },
      inspectionCode: 'IO 6',
      description: 'Baseline Program',
      interval: { hours: '-', months: '60', tech: '-', aftf: '6098.4' },
      lastDone: { date: '31-Jan-2025', tech: '-', aftf: '-' },
      nextDue: { date: '1-Jan-2030', tech: '-', aftf: '-' },
      reference: '1-Jan-2030',
      status: 'green'
    },
    {
      id: 7,
      remaining: { months: '-', days: '-', tech: '1165.6', aftf: '1165.6' },
      inspectionCode: 'IO 7',
      description: 'Baseline Program (to find un/intentionally removed)\n1. Protective Finish - Damaged or Deteriorated\n2. Improper Bonding - Brackets and skin attachments inspection\n3. Protective Finish - Damage to protective finish elements inspection',
      interval: { hours: '1000', months: '-', tech: '-', aftf: '6098.4' },
      lastDone: { date: '31-Jan-2025', tech: '7055.0', aftf: '7055.0' },
      nextDue: { date: '1-Jan-2026', tech: '-', aftf: '-' },
      reference: '1-Jan-2026',
      status: 'white'
    },
    {
      id: 8,
      remaining: { months: '4.23', days: '128', tech: '169.6', aftf: '1892.6' },
      inspectionCode: 'IO 8',
      description: 'Wing Inspection - Detailed',
      interval: { hours: '500', months: '12', tech: '-', aftf: '7069.4' },
      lastDone: { date: '16-Mar-2025', tech: '7589.4', aftf: '7589.4' },
      nextDue: { date: '16-Mar-2026', tech: '8089.4', aftf: '8089.4' },
      reference: '16-Mar-2026',
      status: 'yellow'
    },
    {
      id: 9,
      remaining: { months: '7.67', days: '233', tech: '-', aftf: '-' },
      inspectionCode: 'IO 9',
      description: 'Fuselage Inspection',
      interval: { hours: '-', months: '24', tech: '-', aftf: '6359.4' },
      lastDone: { date: '20-Jun-2024', tech: '-', aftf: '-' },
      nextDue: { date: '20-Jun-2026', tech: '-', aftf: '-' },
      reference: '20-Jun-2026',
      status: 'white'
    },
    {
      id: 10,
      remaining: { months: '3.87', days: '117', tech: '169.6', aftf: '1892.6' },
      inspectionCode: 'IO 10',
      description: 'Landing Gear Inspection',
      interval: { hours: '200', months: '6', tech: '-', aftf: '7789.4' },
      lastDone: { date: '5-Sep-2025', tech: '7889.4', aftf: '7789.4' },
      nextDue: { date: '5-Mar-2026', tech: '8089.4', aftf: '8089.4' },
      reference: '5-Mar-2026',
      status: 'yellow'
    }
  ];

  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-100';
      case 'yellow':
        return 'bg-yellow-100';
      case 'red':
        return 'bg-red-100';
      default:
        return 'bg-white';
    }
  };

  // Pagination logic
  const totalItems = inspectionData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = inspectionData.slice(startIndex, endIndex);

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to List</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Inspection
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-gray-900">CPCP Monitoring - RP-C12</h1>
            <p className="text-sm text-gray-600 mt-1">Corrosion Prevention and Control Program Monitoring</p>
          </div>

          {/* Inspections Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-gray-900">CPCP Inspections ({totalItems})</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                </span>
                <span className="text-sm text-gray-600">Items per page:</span>
                <select 
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent cursor-pointer hover:border-gray-300 transition-colors"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Color Legend */}
            <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-green-100 border border-gray-300"></div>
                <span className="text-xs text-gray-700">Less than 40% Remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-yellow-100 border border-gray-300"></div>
                <span className="text-xs text-gray-700">Less than 20% Remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 bg-red-100 border border-gray-300"></div>
                <span className="text-xs text-gray-700">Due</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th colSpan={4} className="px-4 py-2 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Remaining
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Inspection<br/>Code
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Description
                    </th>
                    <th colSpan={4} className="px-4 py-2 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Interval
                    </th>
                    <th colSpan={3} className="px-4 py-2 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Last Done
                    </th>
                    <th colSpan={3} className="px-4 py-2 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Next Due
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs text-gray-700 uppercase tracking-wider bg-gray-50">
                      Reference
                    </th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Months</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Days</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Tech</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50 border-r border-gray-200">AFTF</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Hours</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Months</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Tech</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50 border-r border-gray-200">AFTF</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Date</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Tech</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50 border-r border-gray-200">AFTF</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Date</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50">Tech</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-600 bg-gray-50 border-r border-gray-200">AFTF</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => (
                    <tr key={item.id} className={`border-b border-gray-200 ${getRowBackgroundColor(item.status)}`}>
                      <td className="px-4 py-3 text-gray-900">{item.remaining.months}</td>
                      <td className="px-4 py-3 text-gray-900">{item.remaining.days}</td>
                      <td className="px-4 py-3 text-gray-900">{item.remaining.tech}</td>
                      <td className="px-4 py-3 text-gray-900 border-r border-gray-200">{item.remaining.aftf}</td>
                      <td className="px-4 py-3 text-gray-900 border-r border-gray-200">{item.inspectionCode}</td>
                      <td className="px-4 py-3 text-gray-900 border-r border-gray-200 max-w-xs">
                        <div className="whitespace-pre-line">{item.description}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{item.interval.hours}</td>
                      <td className="px-4 py-3 text-gray-900">{item.interval.months}</td>
                      <td className="px-4 py-3 text-gray-900">{item.interval.tech}</td>
                      <td className="px-4 py-3 text-gray-900 border-r border-gray-200">{item.interval.aftf}</td>
                      <td className="px-4 py-3 text-gray-900">{item.lastDone.date}</td>
                      <td className="px-4 py-3 text-gray-900">{item.lastDone.tech}</td>
                      <td className="px-4 py-3 text-gray-900 border-r border-gray-200">{item.lastDone.aftf}</td>
                      <td className="px-4 py-3 text-gray-900">{item.nextDue.date}</td>
                      <td className="px-4 py-3 text-gray-900">{item.nextDue.tech}</td>
                      <td className="px-4 py-3 text-gray-900 border-r border-gray-200">{item.nextDue.aftf}</td>
                      <td className="px-4 py-3 text-gray-900">{item.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Inspection Modal */}
      {showAddModal && (
        <AddInspectionModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => {
            console.log('New inspection data:', data);
            // Handle the inspection data submission here
          }}
        />
      )}
    </div>
  );
}
