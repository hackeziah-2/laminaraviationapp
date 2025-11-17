import { RefreshCw, Printer, Download, Search, Filter, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';

export function AircraftFleetDailyUpdate() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const allAircraftData = [
    {
      ident: 'RP-C12',
      status: 'Operational',
      nextInspDue: '50 HRS',
      tachDue: '7940.1',
      tachEod: '7894.8',
      remainingNextInsp: '45.3',
      remainingEngine: '450.8',
      remainingPropeller: '450.8',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-green-100',
      criticalValue: null
    },
    {
      ident: 'RP-C14',
      status: 'ONGOING MAINTENANCE',
      nextInspDue: '200 HRS',
      tachDue: '1603.2',
      tachEod: '1603',
      remainingNextInsp: '0.2',
      remainingEngine: '507.9',
      remainingPropeller: '507.9',
      remarks: 'Ongoing 200 HRS Inspection',
      statusColor: 'yellow',
      rowColor: 'bg-yellow-100',
      criticalValue: 'remainingNextInsp'
    },
    {
      ident: 'RP-C20',
      status: 'Operational',
      nextInspDue: '200 HRS',
      tachDue: '4240.9',
      tachEod: '4225.8',
      remainingNextInsp: '15.1',
      remainingEngine: '1664.2',
      remainingPropeller: '1664.2',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-orange-100',
      criticalValue: null
    },
    {
      ident: 'RP-C4088',
      status: 'AOG',
      nextInspDue: '200 HRS',
      tachDue: '5600.3',
      tachEod: '5573.1',
      remainingNextInsp: '27.2',
      remainingEngine: '865.7',
      remainingPropeller: '1538.5',
      remarks: 'Crack found on Lower Right Fuselage Doorpost',
      statusColor: 'red',
      rowColor: 'bg-red-100',
      criticalValue: null
    },
    {
      ident: 'RP-C5288',
      status: 'Operational',
      nextInspDue: '50 HRS',
      tachDue: '1148.4',
      tachEod: '1101.5',
      remainingNextInsp: '46.9',
      remainingEngine: '859.8',
      remainingPropeller: '1004.6',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-purple-100',
      criticalValue: null
    },
    {
      ident: 'RP-C9012',
      status: 'Operational',
      nextInspDue: '200 HRS',
      tachDue: '2194.3',
      tachEod: '2150.1',
      remainingNextInsp: '44.2',
      remainingEngine: '2039.9',
      remainingPropeller: '1252.5',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-pink-100',
      criticalValue: null
    },
    {
      ident: 'RP-C25',
      status: 'Operational',
      nextInspDue: '1D HRS',
      tachDue: '190.7',
      tachEod: '190.8',
      remainingNextInsp: '69.2',
      remainingEngine: '410.8',
      remainingPropeller: '410.8',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-teal-100',
      criticalValue: null
    },
    {
      ident: 'RP-C22',
      status: 'Operational',
      nextInspDue: '200 HRS',
      tachDue: '424.0',
      tachEod: '425.8',
      remainingNextInsp: '15.1',
      remainingEngine: '564.0',
      remainingPropeller: '564.0',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-blue-100',
      criticalValue: null
    },
    {
      ident: 'RP-C1408',
      status: 'Operational',
      nextInspDue: '1D HRS',
      tachDue: '344.7',
      tachEod: '350.3',
      remainingNextInsp: '24.8',
      remainingEngine: '1820.9',
      remainingPropeller: '1826.5',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-lime-100',
      criticalValue: null
    },
    {
      ident: 'RP-C7349',
      status: 'Operational',
      nextInspDue: '200 HRS',
      tachDue: '169.2',
      tachEod: '181.6',
      remainingNextInsp: '36.2',
      remainingEngine: '2333.4',
      remainingPropeller: '2345.8',
      remarks: '-',
      statusColor: 'green',
      rowColor: 'bg-indigo-100',
      criticalValue: null
    }
  ];

  // Filter and search logic
  const filteredData = useMemo(() => {
    let filtered = [...allAircraftData];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(aircraft => {
        if (filterStatus === 'operational') return aircraft.status === 'Operational';
        if (filterStatus === 'maintenance') return aircraft.status === 'ONGOING MAINTENANCE';
        if (filterStatus === 'aog') return aircraft.status === 'AOG';
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(aircraft => 
        aircraft.ident.toLowerCase().includes(query) ||
        aircraft.status.toLowerCase().includes(query) ||
        aircraft.nextInspDue.toLowerCase().includes(query) ||
        aircraft.remarks.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [filterStatus, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, itemsPerPage]);

  // Get status counts
  const statusCounts = useMemo(() => {
    return {
      all: allAircraftData.length,
      operational: allAircraftData.filter(a => a.status === 'Operational').length,
      maintenance: allAircraftData.filter(a => a.status === 'ONGOING MAINTENANCE').length,
      aog: allAircraftData.filter(a => a.status === 'AOG').length
    };
  }, []);

  const getStatusBadge = (status: string, color: string) => {
    const colorClasses = {
      green: 'bg-green-500 text-white',
      yellow: 'bg-yellow-400 text-gray-900',
      red: 'bg-red-500 text-white'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs ${colorClasses[color as keyof typeof colorClasses]}`}>
        {status}
      </span>
    );
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl text-gray-900">Aircraft Fleet Daily Update</h2>
          <p className="text-gray-600 mt-1 text-sm">Daily maintenance status and maintenance tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Blue Header Bar */}
        <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <h3 className="text-sm">AIRCRAFT FLEET DAILY UPDATE</h3>
          <span className="text-sm">DATE: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</span>
        </div>

        {/* Search and Filters */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ident, status, inspection, or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Showing count and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-gray-600">
                Showing {filteredData.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} aircraft
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filter by Status</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundPosition: 'right 8px center' }}
                >
                  <option value="all">All Aircraft ({statusCounts.all})</option>
                  <option value="operational">Operational ({statusCounts.operational})</option>
                  <option value="maintenance">Under Maintenance ({statusCounts.maintenance})</option>
                  <option value="aog">AOG ({statusCounts.aog})</option>
                </select>
              </div>
            </div>

            {/* Right: Items per page */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundPosition: 'right 8px center' }}
              >
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-4 py-3 text-left text-gray-900 text-xs border-r border-gray-300">
                  A/C IDENT
                </th>
                <th className="px-4 py-3 text-left text-gray-900 text-xs border-r border-gray-300">
                  STATUS
                </th>
                <th className="px-4 py-3 text-left text-gray-900 text-xs border-r border-gray-300">
                  NEXT INSP. DUE
                </th>
                <th colSpan={2} className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  TACH TIME
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  REMAINING<br/>TIME BEFORE<br/>NEXT INSP (HRS)
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  REMAINING<br/>TIME BEFORE<br/>ENGINE<br/>OVERHAUL (HRS)
                </th>
                <th className="px-4 py-3 text-center text-gray-900 text-xs border-r border-gray-300">
                  REMAINING<br/>TIME BEFORE<br/>PROPELLER<br/>OVERHAUL (HRS)
                </th>
                <th className="px-4 py-3 text-left text-gray-900 text-xs">
                  REMARKS
                </th>
              </tr>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th className="px-4 py-2 text-center text-gray-700 text-xs border-r border-gray-300">DUE</th>
                <th className="px-4 py-2 text-center text-gray-700 text-xs border-r border-gray-300">EOD</th>
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th className="border-r border-gray-300"></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No aircraft found matching your filters.
                  </td>
                </tr>
              ) : (
                currentData.map((aircraft, index) => (
                <tr 
                  key={index} 
                  className={`border-b border-gray-200 ${aircraft.rowColor}`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                    {aircraft.ident}
                  </td>
                  <td className="px-4 py-3 text-sm border-r border-gray-300">
                    {getStatusBadge(aircraft.status, aircraft.statusColor)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                    {aircraft.nextInspDue}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                    {aircraft.tachDue}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                    {aircraft.tachEod}
                  </td>
                  <td className={`px-4 py-3 text-sm text-center border-r border-gray-300 ${
                    aircraft.criticalValue === 'remainingNextInsp' ? 'bg-red-500 text-white' : 'text-gray-900'
                  }`}>
                    {aircraft.remainingNextInsp}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                    {aircraft.remainingEngine}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center border-r border-gray-300">
                    {aircraft.remainingPropeller}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {aircraft.remarks}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
