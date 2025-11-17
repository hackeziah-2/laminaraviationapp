import { Search, Filter, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Printer, Download, Plus, X, ChevronDown, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAircrafts } from '../hooks/useAircrafts';

interface Aircraft {
  id: number;
  registration: string;
  type: string;
  model: string;
  msn: string;
  baseLocation: string;
  ownership: string;
  status: 'Active' | 'In Maintenance' | 'Leased';
  aircraftInfo: {
    type: string;
    model: string;
    registration: string;
    msn: string;
    baseLocation: string;
    ownershipType: string;
  };
  airframeInfo: {
    serviceManualYear: string;
    ipcYear: string;
  };
  engineInfo: {
    engineModel: string;
    engineSerialNumber: string;
    engineARC: string;
  };
  propellerInfo: {
    propellerModel: string;
    propellerSerialNumber: string;
    propellerARC: string;
  };
}

export function AircraftFleetProfile() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showAddAircraftModal, setShowAddAircraftModal] = useState(false);
  const [engineARCFile, setEngineARCFile] = useState<File | null>(null);
  const [propellerARCFile, setPropellerARCFile] = useState<File | null>(null);


  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(false);

  const { aircrafts, loading, error, totalPage: totalPageFromHook } = useAircrafts(page, 5, search);

  console.log(aircrafts);


  // console.log(aircrafts);

  const handleViewAircraft = (aircraftId: number, view: string = 'detail') => {
    switch (view) {
      case 'detail':
        navigate(`/profile/${aircraftId}`);
        break;
      case 'logbook':
        navigate(`/profile/${aircraftId}/logbook`);
        break;
      case 'maintenance':
        navigate(`/profile/${aircraftId}/maintenance`);
        break;
      case 'operation':
        navigate(`/profile/${aircraftId}/operation`);
        break;
      default:
        navigate(`/profile/${aircraftId}`);
    }
  };


  const aircraft: Aircraft[] = [
    {
      id: 1,
      registration: 'N12345',
      type: 'Boeing',
      model: '737-800',
      msn: 'MSN-40234',
      baseLocation: 'LAX',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '737-800',
        registration: 'N12345',
        msn: 'MSN-40234',
        baseLocation: 'LAX',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2020',
        ipcYear: '2021'
      },
      engineInfo: {
        engineModel: 'CFM56-7B27',
        engineSerialNumber: 'ENG-789456',
        engineARC: 'ARC-2024-001'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 2,
      registration: 'RP-C1234',
      type: 'Airbus',
      model: 'A320-200',
      msn: 'MSN-50123',
      baseLocation: 'BNL',
      ownership: 'Leased',
      status: 'In Maintenance',
      aircraftInfo: {
        type: 'Airbus',
        model: 'A320-200',
        registration: 'RP-C1234',
        msn: 'MSN-50123',
        baseLocation: 'BNL',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2019',
        ipcYear: '2020'
      },
      engineInfo: {
        engineModel: 'IAE V2500',
        engineSerialNumber: 'ENG-456789',
        engineARC: 'ARC-2024-002'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 3,
      registration: 'N98765',
      type: 'Cessna',
      model: '172 Skyhawk',
      msn: 'MSN-17280234',
      baseLocation: 'RPVM',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Cessna',
        model: '172 Skyhawk',
        registration: 'N98765',
        msn: 'MSN-17280234',
        baseLocation: 'RPVM',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2018',
        ipcYear: '2019'
      },
      engineInfo: {
        engineModel: 'Lycoming O-320',
        engineSerialNumber: 'ENG-123456',
        engineARC: 'ARC-2023-001'
      },
      propellerInfo: {
        propellerModel: 'McCauley 1C172',
        propellerSerialNumber: 'PROP-789012',
        propellerARC: 'ARC-2023-002'
      }
    },
    {
      id: 4,
      registration: 'N77777',
      type: 'Boeing',
      model: '777-300ER',
      msn: 'MSN-60789',
      baseLocation: 'JFK',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '777-300ER',
        registration: 'N77777',
        msn: 'MSN-60789',
        baseLocation: 'JFK',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2021',
        ipcYear: '2022'
      },
      engineInfo: {
        engineModel: 'GE90-115B',
        engineSerialNumber: 'ENG-654321',
        engineARC: 'ARC-2024-003'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 5,
      registration: 'RP-C9999',
      type: 'Airbus',
      model: 'A350-900',
      msn: 'MSN-70456',
      baseLocation: 'RPLL',
      ownership: 'Leased',
      status: 'Active',
      aircraftInfo: {
        type: 'Airbus',
        model: 'A350-900',
        registration: 'RP-C9999',
        msn: 'MSN-70456',
        baseLocation: 'RPLL',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2022',
        ipcYear: '2023'
      },
      engineInfo: {
        engineModel: 'Trent XWB',
        engineSerialNumber: 'ENG-987654',
        engineARC: 'ARC-2024-004'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 6,
      registration: 'N54321',
      type: 'Boeing',
      model: '787-9',
      msn: 'MSN-80123',
      baseLocation: 'ORD',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '787-9',
        registration: 'N54321',
        msn: 'MSN-80123',
        baseLocation: 'ORD',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2023',
        ipcYear: '2024'
      },
      engineInfo: {
        engineModel: 'GEnx-1B',
        engineSerialNumber: 'ENG-111222',
        engineARC: 'ARC-2024-005'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 7,
      registration: 'RP-C5678',
      type: 'Airbus',
      model: 'A321neo',
      msn: 'MSN-90234',
      baseLocation: 'MNL',
      ownership: 'Leased',
      status: 'In Maintenance',
      aircraftInfo: {
        type: 'Airbus',
        model: 'A321neo',
        registration: 'RP-C5678',
        msn: 'MSN-90234',
        baseLocation: 'MNL',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2021',
        ipcYear: '2022'
      },
      engineInfo: {
        engineModel: 'PW1100G',
        engineSerialNumber: 'ENG-333444',
        engineARC: 'ARC-2024-006'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 8,
      registration: 'N24680',
      type: 'Boeing',
      model: '737 MAX 8',
      msn: 'MSN-11234',
      baseLocation: 'DFW',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '737 MAX 8',
        registration: 'N24680',
        msn: 'MSN-11234',
        baseLocation: 'DFW',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2023',
        ipcYear: '2024'
      },
      engineInfo: {
        engineModel: 'LEAP-1B',
        engineSerialNumber: 'ENG-555666',
        engineARC: 'ARC-2024-007'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 9,
      registration: 'N13579',
      type: 'Embraer',
      model: 'E175',
      msn: 'MSN-22345',
      baseLocation: 'ATL',
      ownership: 'Leased',
      status: 'Active',
      aircraftInfo: {
        type: 'Embraer',
        model: 'E175',
        registration: 'N13579',
        msn: 'MSN-22345',
        baseLocation: 'ATL',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2020',
        ipcYear: '2021'
      },
      engineInfo: {
        engineModel: 'CF34-8E',
        engineSerialNumber: 'ENG-777888',
        engineARC: 'ARC-2024-008'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 10,
      registration: 'RP-C8642',
      type: 'Airbus',
      model: 'A330-300',
      msn: 'MSN-33456',
      baseLocation: 'CEB',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Airbus',
        model: 'A330-300',
        registration: 'RP-C8642',
        msn: 'MSN-33456',
        baseLocation: 'CEB',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2019',
        ipcYear: '2020'
      },
      engineInfo: {
        engineModel: 'Trent 700',
        engineSerialNumber: 'ENG-999000',
        engineARC: 'ARC-2024-009'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 11,
      registration: 'N86420',
      type: 'Bombardier',
      model: 'CRJ-900',
      msn: 'MSN-44567',
      baseLocation: 'DEN',
      ownership: 'Leased',
      status: 'In Maintenance',
      aircraftInfo: {
        type: 'Bombardier',
        model: 'CRJ-900',
        registration: 'N86420',
        msn: 'MSN-44567',
        baseLocation: 'DEN',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2018',
        ipcYear: '2019'
      },
      engineInfo: {
        engineModel: 'CF34-8C5',
        engineSerialNumber: 'ENG-101102',
        engineARC: 'ARC-2023-010'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 12,
      registration: 'N97531',
      type: 'Boeing',
      model: '767-300ER',
      msn: 'MSN-55678',
      baseLocation: 'SEA',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '767-300ER',
        registration: 'N97531',
        msn: 'MSN-55678',
        baseLocation: 'SEA',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2017',
        ipcYear: '2018'
      },
      engineInfo: {
        engineModel: 'PW4062',
        engineSerialNumber: 'ENG-202203',
        engineARC: 'ARC-2023-011'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    }
  ];
  
  // Calculate status counts
  const statusCounts = {
    all: aircraft.length,
    active: aircraft.filter(ac => ac.status === 'Active').length,
    'in maintenance': aircraft.filter(ac => ac.status === 'In Maintenance').length,
    leased: aircraft.filter(ac => ac.status === 'Leased').length,
  };

  const filteredAircraft = aircraft.filter((ac) => {
    const matchesSearch =
      ac.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ac.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ac.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ac.baseLocation.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      ac.status.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredAircraft.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAircraft = filteredAircraft.slice(startIndex, startIndex + itemsPerPage);
  


  // Reset to page 1 when search or filter changes
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
      case 'Active':
        return 'bg-emerald-500/10 text-emerald-700 border border-emerald-200';
      case 'In Maintenance':
        return 'bg-amber-500/10 text-amber-700 border border-amber-200';
      case 'Leased':
        return 'bg-blue-500/10 text-blue-700 border border-blue-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">Aircraft Fleet Profile</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Comprehensive aircraft fleet management and tracking</p>
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
            onClick={() => setShowAddAircraftModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Aircraft</span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <span className="tracking-wide text-sm sm:text-base">AIRCRAFT FLEET PROFILE</span>
        <span className="text-sm">DATE: 14 NOV 25</span>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Aircraft
            </label>
            <input
              type="text"
              placeholder="Search by registration, type, model, or location..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Aircraft ({statusCounts.all})</option>
              <option value="active">Active ({statusCounts.active})</option>
              <option value="in maintenance">In Maintenance ({statusCounts['in maintenance']})</option>
              <option value="leased">Leased ({statusCounts.leased})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Header Info */}
      <div className="text-gray-600">
        Showing {filteredAircraft.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredAircraft.length)} of {filteredAircraft.length} aircraft
      </div>

      {/* Aircraft Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">AC REG</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Aircraft Type</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">MSN</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Base Location</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAircraft.length > 0 ? (
                paginatedAircraft.map((ac) => (
                  <tr key={ac.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5 text-gray-900">{ac.registration}</td>
                    <td className="px-6 py-3.5 text-gray-900">{ac.type}</td>
                    <td className="px-6 py-3.5 text-gray-900">{ac.model}</td>
                    <td className="px-6 py-3.5 text-gray-600">{ac.msn}</td>
                    <td className="px-6 py-3.5 text-gray-900">{ac.baseLocation}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getStatusColor(ac.status)}`}>
                        {ac.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleViewAircraft(ac.id, e.target.value);
                              e.target.value = ''; // Reset selection
                            }
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                        >
                          <option value="">View</option>
                          <option value="detail">General Information</option>
                          <option value="logbook">Maintenance Logbook</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="operation">Operation</option>
                        </select>
                        <button
                          className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No aircraft found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Dynamic page numbers */}
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
                  className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-gray-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="min-w-[2rem] px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Aircraft Modal */}
      {showAddAircraftModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-modal-overlay">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-content">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-gray-900">Add New Aircraft</h3>
                <p className="text-gray-400 text-sm mt-1">Enter the aircraft details to add it to your fleet. All fields are required.</p>
              </div>
              <button
                onClick={() => setShowAddAircraftModal(false)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6 bg-gray-50">
              {/* Aircraft Type & Model */}
              <div className="space-y-4">
                <h4 className="text-gray-900">Aircraft Type</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Aircraft Type</label>
                    <input
                      type="text"
                      placeholder="e.g., Boeing, Airbus, Cessna"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Model</label>
                    <input
                      type="text"
                      placeholder="e.g., 737-800, A320-200, 172"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* MSN & Registration Number */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">MSN (Manufacturer Serial Number)</label>
                    <input
                      type="text"
                      placeholder="MSN-12345"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Registration Number</label>
                    <input
                      type="text"
                      placeholder="N12345 or RP-C1234"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Base Location & Ownership Type */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Base Location</label>
                    <input
                      type="text"
                      placeholder="RPLL, RPVM, LAX, etc."
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-gray-600 text-sm mb-2">Ownership Type</label>
                    <select className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 appearance-none cursor-pointer shadow-sm">
                      <option value="">Owned</option>
                      <option value="leased">Leased</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-[2.6rem] w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Airframe Information */}
              <div className="bg-white rounded-lg px-6 py-5 space-y-5 shadow-sm">
                <h4 className="text-gray-900">Airframe Information</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Service Manual Year</label>
                    <input
                      type="text"
                      placeholder="e.g., 2020"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">IPC Year</label>
                    <input
                      type="text"
                      placeholder="e.g., 2021"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Engine Information */}
              <div className="bg-white rounded-lg px-6 py-5 space-y-5 shadow-sm">
                <h4 className="text-gray-900">Engine Information</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Engine Model</label>
                    <input
                      type="text"
                      placeholder="e.g., CFM56-7B27"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Engine Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g., ENG-123456"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Engine ARC (Attachment)</label>
                  <div className="relative">
                    <input
                      type="file"
                      id="engine-arc-file"
                      onChange={(e) => setEngineARCFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="engine-arc-file"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className={engineARCFile ? "text-gray-900" : "text-gray-400"}>
                        {engineARCFile ? engineARCFile.name : "Choose file or N/A"}
                      </span>
                      <Upload className="w-4 h-4 text-gray-400" />
                    </label>
                  </div>
                  {engineARCFile && (
                    <button
                      onClick={() => setEngineARCFile(null)}
                      className="text-xs text-red-600 hover:text-red-700 mt-1"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              {/* Propeller Information */}
              <div className="bg-white rounded-lg px-6 py-5 space-y-5 shadow-sm">
                <h4 className="text-gray-900">Propeller Information</h4>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Propeller Model</label>
                    <input
                      type="text"
                      placeholder="e.g., McCauley 1A38C359 or N/A"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">Propeller Serial Number</label>
                    <input
                      type="text"
                      placeholder="e.g., PROP-987654 or N/A"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Propeller ARC (Attachment)</label>
                  <div className="relative">
                    <input
                      type="file"
                      id="propeller-arc-file"
                      onChange={(e) => setPropellerARCFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="propeller-arc-file"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <span className={propellerARCFile ? "text-gray-900" : "text-gray-400"}>
                        {propellerARCFile ? propellerARCFile.name : "Choose file or N/A"}
                      </span>
                      <Upload className="w-4 h-4 text-gray-400" />
                    </label>
                  </div>
                  {propellerARCFile && (
                    <button
                      onClick={() => setPropellerARCFile(null)}
                      className="text-xs text-red-600 hover:text-red-700 mt-1"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end flex-shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddAircraftModal(false)}
                  className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                >
                  Cancel
                </button>
                <button className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                  Add Aircraft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
