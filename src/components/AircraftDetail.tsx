import { ArrowLeft, Printer, Download, Pencil, FileText } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

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

export function AircraftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = parseInt(id || '1');

  const handleBack = () => {
    navigate('/profile');
  };

  // In a real app, this would fetch data based on aircraftId
  // For now, we'll use the same mock data
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
        engineARC: 'ARC-2023-045'
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
      model: 'Citation X',
      msn: 'MSN-30456',
      baseLocation: 'JFK',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Cessna',
        model: 'Citation X',
        registration: 'N98765',
        msn: 'MSN-30456',
        baseLocation: 'JFK',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2021',
        ipcYear: '2022'
      },
      engineInfo: {
        engineModel: 'Rolls-Royce AE 3007C',
        engineSerialNumber: 'ENG-123456',
        engineARC: 'ARC-2024-010'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 4,
      registration: 'RP-C5678',
      type: 'Embraer',
      model: 'E190',
      msn: 'MSN-19045',
      baseLocation: 'CEB',
      ownership: 'Leased',
      status: 'Active',
      aircraftInfo: {
        type: 'Embraer',
        model: 'E190',
        registration: 'RP-C5678',
        msn: 'MSN-19045',
        baseLocation: 'CEB',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2020',
        ipcYear: '2021'
      },
      engineInfo: {
        engineModel: 'GE CF34-10E',
        engineSerialNumber: 'ENG-987654',
        engineARC: 'ARC-2024-005'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 5,
      registration: 'N45678',
      type: 'Bombardier',
      model: 'CRJ-900',
      msn: 'MSN-15234',
      baseLocation: 'ORD',
      ownership: 'Owned',
      status: 'In Maintenance',
      aircraftInfo: {
        type: 'Bombardier',
        model: 'CRJ-900',
        registration: 'N45678',
        msn: 'MSN-15234',
        baseLocation: 'ORD',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2018',
        ipcYear: '2019'
      },
      engineInfo: {
        engineModel: 'GE CF34-8C5',
        engineSerialNumber: 'ENG-555666',
        engineARC: 'ARC-2023-078'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 6,
      registration: 'RP-C9012',
      type: 'ATR',
      model: 'ATR 72-600',
      msn: 'MSN-12389',
      baseLocation: 'DVO',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'ATR',
        model: 'ATR 72-600',
        registration: 'RP-C9012',
        msn: 'MSN-12389',
        baseLocation: 'DVO',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2022',
        ipcYear: '2023'
      },
      engineInfo: {
        engineModel: 'PW127M',
        engineSerialNumber: 'ENG-333444',
        engineARC: 'ARC-2024-020'
      },
      propellerInfo: {
        propellerModel: 'Hamilton Standard 568F',
        propellerSerialNumber: 'PROP-111222',
        propellerARC: 'ARC-2024-021'
      }
    },
    {
      id: 7,
      registration: 'N23456',
      type: 'Airbus',
      model: 'A330-300',
      msn: 'MSN-60345',
      baseLocation: 'SFO',
      ownership: 'Leased',
      status: 'Active',
      aircraftInfo: {
        type: 'Airbus',
        model: 'A330-300',
        registration: 'N23456',
        msn: 'MSN-60345',
        baseLocation: 'SFO',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2019',
        ipcYear: '2020'
      },
      engineInfo: {
        engineModel: 'Trent 772B',
        engineSerialNumber: 'ENG-777888',
        engineARC: 'ARC-2024-015'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 8,
      registration: 'RP-C3456',
      type: 'Boeing',
      model: '777-300ER',
      msn: 'MSN-70456',
      baseLocation: 'MNL',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '777-300ER',
        registration: 'RP-C3456',
        msn: 'MSN-70456',
        baseLocation: 'MNL',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2021',
        ipcYear: '2022'
      },
      engineInfo: {
        engineModel: 'GE90-115B',
        engineSerialNumber: 'ENG-999000',
        engineARC: 'ARC-2024-030'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 9,
      registration: 'N67890',
      type: 'Gulfstream',
      model: 'G650',
      msn: 'MSN-6189',
      baseLocation: 'TEB',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Gulfstream',
        model: 'G650',
        registration: 'N67890',
        msn: 'MSN-6189',
        baseLocation: 'TEB',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2023',
        ipcYear: '2023'
      },
      engineInfo: {
        engineModel: 'Rolls-Royce BR725',
        engineSerialNumber: 'ENG-444555',
        engineARC: 'ARC-2024-040'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 10,
      registration: 'RP-C7890',
      type: 'De Havilland',
      model: 'Dash 8-400',
      msn: 'MSN-4345',
      baseLocation: 'ILO',
      ownership: 'Leased',
      status: 'In Maintenance',
      aircraftInfo: {
        type: 'De Havilland',
        model: 'Dash 8-400',
        registration: 'RP-C7890',
        msn: 'MSN-4345',
        baseLocation: 'ILO',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2017',
        ipcYear: '2018'
      },
      engineInfo: {
        engineModel: 'PW150A',
        engineSerialNumber: 'ENG-222333',
        engineARC: 'ARC-2023-090'
      },
      propellerInfo: {
        propellerModel: 'Dowty R408',
        propellerSerialNumber: 'PROP-555666',
        propellerARC: 'ARC-2023-091'
      }
    },
    {
      id: 11,
      registration: 'N34567',
      type: 'Boeing',
      model: '787-9',
      msn: 'MSN-80123',
      baseLocation: 'SEA',
      ownership: 'Owned',
      status: 'Active',
      aircraftInfo: {
        type: 'Boeing',
        model: '787-9',
        registration: 'N34567',
        msn: 'MSN-80123',
        baseLocation: 'SEA',
        ownershipType: 'Owned'
      },
      airframeInfo: {
        serviceManualYear: '2022',
        ipcYear: '2023'
      },
      engineInfo: {
        engineModel: 'GEnx-1B',
        engineSerialNumber: 'ENG-101010',
        engineARC: 'ARC-2024-050'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    },
    {
      id: 12,
      registration: 'RP-C2345',
      type: 'Airbus',
      model: 'A350-900',
      msn: 'MSN-90234',
      baseLocation: 'MNL',
      ownership: 'Leased',
      status: 'Leased',
      aircraftInfo: {
        type: 'Airbus',
        model: 'A350-900',
        registration: 'RP-C2345',
        msn: 'MSN-90234',
        baseLocation: 'MNL',
        ownershipType: 'Leased'
      },
      airframeInfo: {
        serviceManualYear: '2023',
        ipcYear: '2023'
      },
      engineInfo: {
        engineModel: 'Trent XWB-84',
        engineSerialNumber: 'ENG-202020',
        engineARC: 'ARC-2024-060'
      },
      propellerInfo: {
        propellerModel: 'N/A',
        propellerSerialNumber: 'N/A',
        propellerARC: 'N/A'
      }
    }
  ];

  const selectedAircraft = aircraft.find(ac => ac.id === aircraftId);

  if (!selectedAircraft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-gray-900">Aircraft Not Found</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          The aircraft you're looking for could not be found.
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'In Maintenance':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'Leased':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-gray-900 text-lg sm:text-xl">Aircraft Details</h2>
            <span className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getStatusColor(selectedAircraft.status)}`}>
              {selectedAircraft.status}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button className="px-3 sm:px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Aircraft</span>
          </button>
        </div>
      </div>

      {/* Aircraft Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">Aircraft Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Aircraft Type</p>
            <p className="text-gray-900">{selectedAircraft.aircraftInfo.type}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Model</p>
            <p className="text-gray-900">{selectedAircraft.aircraftInfo.model}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Registration Number</p>
            <p className="text-gray-900">{selectedAircraft.aircraftInfo.registration}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">MSN</p>
            <p className="text-gray-900">{selectedAircraft.aircraftInfo.msn}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Base Location</p>
            <p className="text-gray-900">{selectedAircraft.aircraftInfo.baseLocation}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Ownership Type</p>
            <p className="text-gray-900">{selectedAircraft.aircraftInfo.ownershipType}</p>
          </div>
        </div>
      </div>

      {/* Airframe Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">Airframe Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Service Manual Year</p>
            <p className="text-gray-900">{selectedAircraft.airframeInfo.serviceManualYear}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">IPC Year</p>
            <p className="text-gray-900">{selectedAircraft.airframeInfo.ipcYear}</p>
          </div>
        </div>
      </div>

      {/* Engine Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">Engine Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Engine Model</p>
            <p className="text-gray-900">{selectedAircraft.engineInfo.engineModel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Engine Serial Number</p>
            <p className="text-gray-900">{selectedAircraft.engineInfo.engineSerialNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Engine ARC</p>
            {selectedAircraft.engineInfo.engineARC && selectedAircraft.engineInfo.engineARC !== 'N/A' ? (
              <a
                href="#"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  // In a real app, this would trigger the file download
                  alert('File download would start here');
                }}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">{selectedAircraft.engineInfo.engineARC}</span>
                <Download className="w-3.5 h-3.5" />
              </a>
            ) : (
              <p className="text-gray-900">N/A</p>
            )}
          </div>
        </div>
      </div>

      {/* Propeller Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">Propeller Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Propeller Model</p>
            <p className="text-gray-900">{selectedAircraft.propellerInfo.propellerModel}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Propeller Serial Number</p>
            <p className="text-gray-900">{selectedAircraft.propellerInfo.propellerSerialNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Propeller ARC</p>
            {selectedAircraft.propellerInfo.propellerARC && selectedAircraft.propellerInfo.propellerARC !== 'N/A' ? (
              <a
                href="#"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  // In a real app, this would trigger the file download
                  alert('File download would start here');
                }}
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">{selectedAircraft.propellerInfo.propellerARC}</span>
                <Download className="w-3.5 h-3.5" />
              </a>
            ) : (
              <p className="text-gray-900">N/A</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
