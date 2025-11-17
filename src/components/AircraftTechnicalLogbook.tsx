import { Search, Eye, Pencil, ChevronLeft, ChevronRight, Printer, Download, Plus, FileText, Plane, Wrench, Clock } from 'lucide-react';
import { useState } from 'react';
import { AddTechnicalLogbookEntryModal } from './AddTechnicalLogbookEntryModal';
import { ViewTechnicalLogbookEntryModal } from './ViewTechnicalLogbookEntryModal';

interface LogbookEntry {
  id: number;
  line: number;
  reqNo: string;
  date: string;
  acReg: string;
  route: string;
  fltTime: string;
  pilot: string;
  status: 'Serviceable' | 'Under Maintenance';
}

export function AircraftTechnicalLogbook() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);

  const entries: LogbookEntry[] = [
    { id: 1, line: 1, reqNo: '2024-001', date: '10/15/2024', acReg: 'RP-C1234', route: 'MNL → CEB', fltTime: '1.75h', pilot: 'Juan Dela Cruz', status: 'Serviceable' },
    { id: 2, line: 2, reqNo: '2024-002', date: '10/16/2024', acReg: 'RP-C1234', route: 'CEB → DVO', fltTime: '1.50h', pilot: 'Jose Garcia', status: 'Serviceable' },
    { id: 3, line: 3, reqNo: '2024-003', date: '10/17/2024', acReg: 'RP-C4678', route: 'MNL → MNL', fltTime: '1.00h', pilot: 'Ana Reyes', status: 'Under Maintenance' },
    { id: 4, line: 4, reqNo: '2024-004', date: '10/18/2024', acReg: 'RP-C9012', route: 'MNL → ILO', fltTime: '1.25h', pilot: 'Miguel Torres', status: 'Serviceable' },
    { id: 5, line: 5, reqNo: '2024-005', date: '10/19/2024', acReg: 'RP-C1234', route: 'DVO → GES', fltTime: '0.75h', pilot: 'Sofia Martinez', status: 'Serviceable' },
    { id: 6, line: 6, reqNo: '2024-006', date: '10/20/2024', acReg: 'RP-C4678', route: 'MNL → BCD', fltTime: '2.00h', pilot: 'Ricardo Santos', status: 'Serviceable' },
    { id: 7, line: 7, reqNo: '2024-007', date: '10/21/2024', acReg: 'RP-C9012', route: 'ILO → TAC', fltTime: '1.10h', pilot: 'Carmen Lopez', status: 'Serviceable' },
    { id: 8, line: 8, reqNo: '2024-008', date: '10/22/2024', acReg: 'RP-C1234', route: 'GES → MNL', fltTime: '0.80h', pilot: 'Antonio Cruz', status: 'Serviceable' },
    { id: 9, line: 9, reqNo: '2024-009', date: '10/23/2024', acReg: 'RP-C4678', route: 'BCD → CEB', fltTime: '1.40h', pilot: 'Patricia Ramos', status: 'Serviceable' },
    { id: 10, line: 10, reqNo: '2024-010', date: '10/24/2024', acReg: 'RP-C9012', route: 'TAC → DVO', fltTime: '1.65h', pilot: 'Fernando Diaz', status: 'Serviceable' },
    { id: 11, line: 11, reqNo: '2024-011', date: '10/25/2024', acReg: 'RP-C1234', route: 'MNL → CEB', fltTime: '1.70h', pilot: 'Maria Santos', status: 'Serviceable' },
    { id: 12, line: 12, reqNo: '2024-012', date: '10/26/2024', acReg: 'RP-C4678', route: 'CEB → MNL', fltTime: '1.75h', pilot: 'Pedro Reyes', status: 'Under Maintenance' },
    { id: 13, line: 13, reqNo: '2024-013', date: '10/27/2024', acReg: 'RP-C9012', route: 'DVO → MNL', fltTime: '2.10h', pilot: 'Isabel Cruz', status: 'Serviceable' },
    { id: 14, line: 14, reqNo: '2024-014', date: '10/28/2024', acReg: 'RP-C1234', route: 'MNL → ILO', fltTime: '1.30h', pilot: 'Roberto Garcia', status: 'Serviceable' },
    { id: 15, line: 15, reqNo: '2024-015', date: '10/29/2024', acReg: 'RP-C4678', route: 'ILO → MNL', fltTime: '1.25h', pilot: 'Elena Torres', status: 'Serviceable' },
    { id: 16, line: 16, reqNo: '2024-016', date: '10/30/2024', acReg: 'RP-C9012', route: 'MNL → BCD', fltTime: '1.95h', pilot: 'Carlos Martinez', status: 'Serviceable' },
    { id: 17, line: 17, reqNo: '2024-017', date: '10/31/2024', acReg: 'RP-C1234', route: 'BCD → MNL', fltTime: '2.00h', pilot: 'Rosa Lopez', status: 'Serviceable' },
    { id: 18, line: 18, reqNo: '2024-018', date: '11/01/2024', acReg: 'RP-C4678', route: 'MNL → TAC', fltTime: '1.80h', pilot: 'Luis Santos', status: 'Serviceable' },
    { id: 19, line: 19, reqNo: '2024-019', date: '11/02/2024', acReg: 'RP-C9012', route: 'TAC → MNL', fltTime: '1.85h', pilot: 'Angela Reyes', status: 'Serviceable' },
    { id: 20, line: 20, reqNo: '2024-020', date: '11/03/2024', acReg: 'RP-C1234', route: 'MNL → GES', fltTime: '0.90h', pilot: 'Francisco Cruz', status: 'Serviceable' },
  ];

  // Calculate statistics
  const totalEntries = entries.length;
  const serviceable = entries.filter(e => e.status === 'Serviceable').length;
  const underMaintenance = entries.filter(e => e.status === 'Under Maintenance').length;
  const totalFlightHours = entries.reduce((sum, e) => sum + parseFloat(e.fltTime), 0).toFixed(1);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.reqNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.acReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.pilot.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      entry.status.toLowerCase().replace(' ', '-') === filterStatus.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Serviceable':
        return 'bg-emerald-500/10 text-emerald-700 border border-emerald-200';
      case 'Under Maintenance':
        return 'bg-amber-500/10 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">Aircraft Technical Logbook</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Comprehensive flight and maintenance records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Printer className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Print</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Entries</span>
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">{totalEntries}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Serviceable</span>
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">{serviceable}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Under Maintenance</span>
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">{underMaintenance}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Flight Hours</span>
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">{totalFlightHours}</p>
        </div>
      </div>

      {/* Blue Banner */}
      <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg">
        <span className="tracking-wide text-sm sm:text-base">Technical Logbook Entries</span>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2">Search Entries</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by request number, aircraft, route, or station..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
              />
            </div>
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Status</option>
              <option value="serviceable">Serviceable</option>
              <option value="under-maintenance">Under Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Info */}
      <div className="text-gray-600 text-sm">
        Showing {filteredEntries.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">LINE</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">REQ. NO.</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">DATE</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">A/C REG</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">ROUTE</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">FLT TIME</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 text-gray-900">{entry.line}</td>
                    <td className="px-6 py-3.5 text-gray-900">{entry.reqNo}</td>
                    <td className="px-6 py-3.5 text-gray-600">{entry.date}</td>
                    <td className="px-6 py-3.5 text-gray-900">{entry.acReg}</td>
                    <td className="px-6 py-3.5 text-gray-900">{entry.route}</td>
                    <td className="px-6 py-3.5 text-gray-900">{entry.fltTime}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No entries found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 text-sm">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors text-sm ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
            >
              <span>Next</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      <AddTechnicalLogbookEntryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* View Entry Modal */}
      <ViewTechnicalLogbookEntryModal 
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEntry(null);
        }}
        entry={selectedEntry}
      />
    </div>
  );
}
