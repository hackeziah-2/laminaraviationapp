import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, MoreVertical, ChevronLeft as PrevIcon, ChevronRight } from 'lucide-react';

interface CPCPItem {
  id: number;
  aircraft: string;
  msn: string;
  model: string;
  aftf: string;
  totalInspections: number;
  due: number;
  overdue: number;
  status: 'Current' | 'Due Soon' | 'Overdue';
  nextDue: string;
}

export function CPCPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/profile/${id}/maintenance-cpcp`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 2;

  // Sample data
  const cpcpData: CPCPItem[] = [
    {
      id: 1,
      aircraft: 'RP-C213',
      msn: '17XXXX4',
      model: 'Cessna 172S',
      aftf: '7984 H',
      totalInspections: 10,
      due: 2,
      overdue: 0,
      status: 'Current',
      nextDue: '15-Dec-25'
    },
    {
      id: 2,
      aircraft: 'RP-C12',
      msn: '11-03156-26A',
      model: 'Cessna 172S',
      aftf: '7830 H',
      totalInspections: 12,
      due: 1,
      overdue: 1,
      status: 'Due Soon',
      nextDue: '20-Nov-25'
    },
    {
      id: 3,
      aircraft: 'RP-C15',
      msn: '11-03210-30B',
      model: 'Cessna 172S',
      aftf: '6543 H',
      totalInspections: 8,
      due: 0,
      overdue: 2,
      status: 'Overdue',
      nextDue: '05-Oct-25'
    },
    {
      id: 4,
      aircraft: 'RP-C18',
      msn: '11-04567-42C',
      model: 'Cessna 172S',
      aftf: '5234 H',
      totalInspections: 15,
      due: 3,
      overdue: 0,
      status: 'Current',
      nextDue: '18-Jan-26'
    },
    {
      id: 5,
      aircraft: 'RP-C21',
      msn: '11-05678-55D',
      model: 'Cessna 172S',
      aftf: '8932 H',
      totalInspections: 14,
      due: 2,
      overdue: 0,
      status: 'Current',
      nextDue: '22-Jan-26'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Current':
        return 'bg-green-50 text-green-700';
      case 'Due Soon':
        return 'bg-yellow-50 text-yellow-700';
      case 'Overdue':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getDueColor = (count: number) => {
    if (count > 0) return 'text-yellow-600';
    return 'text-gray-900';
  };

  const getOverdueColor = (count: number) => {
    if (count > 0) return 'text-red-600';
    return 'text-gray-900';
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-gray-900">CPCP - Corrosion Prevention and Control Program</h1>
              <p className="text-gray-600 text-sm mt-1">
                Track corrosion inspections and maintenance schedules
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-6 py-3.5 text-left text-xs text-gray-500 uppercase tracking-wide">
                    MSN
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs text-gray-500 uppercase tracking-wide">
                    AFTF
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs text-gray-500 uppercase tracking-wide">
                    Total Inspections
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs text-gray-500 uppercase tracking-wide">
                    Next Due
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {cpcpData.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.msn}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.aftf}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.totalInspections}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.nextDue}
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
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
              <PrevIcon className="w-4 h-4" />
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
  );
}
