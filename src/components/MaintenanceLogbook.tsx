import { ArrowLeft, Search, Download, Printer, Plus, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import exampleImage from 'figma:asset/e2526f8d54383927d73ad6c3ae519a40d151d8ad.png';

interface LogEntry {
  id: number;
  date: string;
  workOrder: string;
  description: string;
  maintenanceType: string;
  technician: string;
  hours: number;
  status: 'Completed' | 'In Progress' | 'Pending';
  category: 'AIRFRAME' | 'AVIONICS' | 'ENGINE' | 'PROPELLER';
}

interface AirframeLogEntry {
  id: number;
  date: string;
  tachTime: number;
  seqNo: string;
  airframeTime: number;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

interface AvionicsLogEntry {
  id: number;
  date: string;
  seqNo: string;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

interface EngineLogEntry {
  id: number;
  date: string;
  tachTime: number;
  seqNo: string;
  engineTime: number;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

interface PropellerLogEntry {
  id: number;
  date: string;
  seqNo: string;
  propellerTime: number;
  description: string;
  mechanicName: string;
  licenseNumber: string;
  signature: string;
}

type Category = 'AIRFRAME' | 'AVIONICS' | 'ENGINE' | 'PROPELLER';

export function MaintenanceLogbook() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = parseInt(id || '1');

  const handleBack = () => {
    navigate('/profile');
  };

  const [activeCategory, setActiveCategory] = useState<Category>('AIRFRAME');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAirframeEntry, setSelectedAirframeEntry] = useState<AirframeLogEntry | null>(null);
  const [selectedAvionicsEntry, setSelectedAvionicsEntry] = useState<AvionicsLogEntry | null>(null);
  const [selectedEngineEntry, setSelectedEngineEntry] = useState<EngineLogEntry | null>(null);
  const [selectedPropellerEntry, setSelectedPropellerEntry] = useState<PropellerLogEntry | null>(null);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);

  // Airframe logbook entries
  const airframeLogEntries: AirframeLogEntry[] = [
    {
      id: 1,
      date: '23/MAR/2024',
      tachTime: 6573.5,
      seqNo: 'AFM-A-12-001',
      airframeTime: 6244.1,
      description: 'PERFORMED 60 HRS INSPECTION I.A.W W/O NO. 17218-A-000699.',
      mechanicName: 'RWEN AMIGEL',
      licenseNumber: 'OFCP FAL / 152E89 AMD',
      signature: 'LAI 003'
    },
    {
      id: 2,
      date: '10/NOV/2024',
      tachTime: 6650.0,
      seqNo: 'AFM-A-12-002',
      airframeTime: 6320.6,
      description: 'PERFORMED 100-HOUR INSPECTION I.A.W W/O NO. 17218-A-000725.',
      mechanicName: 'JOHN SMITH',
      licenseNumber: 'A&P / 198745 AMT',
      signature: 'JS 442'
    },
    {
      id: 3,
      date: '28/OCT/2024',
      tachTime: 6625.5,
      seqNo: 'AFM-A-11-089',
      airframeTime: 6296.1,
      description: 'LANDING GEAR INSPECTION AND SERVICING. REPLACED NOSE GEAR STRUT SEAL I.A.W W/O NO. 17218-A-000698.',
      mechanicName: 'ROBERT CHEN',
      licenseNumber: 'A&P / 203561 AMT',
      signature: 'RC 771'
    },
    {
      id: 4,
      date: '12/NOV/2024',
      tachTime: 6665.0,
      seqNo: 'AFM-A-12-003',
      airframeTime: 6335.6,
      description: 'WING FLAP ACTUATOR REPLACEMENT. PERFORMED OPERATIONAL CHECK I.A.W W/O NO. 17218-A-000732.',
      mechanicName: 'MARIA GARCIA',
      licenseNumber: 'A&P / 176432 AMT',
      signature: 'MG 558'
    },
    {
      id: 5,
      date: '14/NOV/2024',
      tachTime: 6670.5,
      seqNo: 'AFM-A-12-004',
      airframeTime: 6341.1,
      description: 'FUSELAGE SKIN CORROSION TREATMENT. APPLIED PROTECTIVE COATING I.A.W W/O NO. 17218-A-000745.',
      mechanicName: 'ROBERT CHEN',
      licenseNumber: 'A&P / 203561 AMT',
      signature: 'RC 771'
    }
  ];

  // Avionics logbook entries
  const avionicsLogEntries: AvionicsLogEntry[] = [
    {
      id: 1,
      date: '14/NOV/2024',
      seqNo: 'AVI-A-12-001',
      description: 'AVIONICS SOFTWARE UPDATE FOR GARMIN G1000 SYSTEM I.A.W W/O NO. 17218-AV-000189.',
      mechanicName: 'SARAH JOHNSON',
      licenseNumber: 'FCC GROL / AV-98762',
      signature: 'SJ 234'
    },
    {
      id: 2,
      date: '08/NOV/2024',
      seqNo: 'AVI-A-11-078',
      description: 'GPS NAVIGATION SYSTEM CALIBRATION AND DATABASE UPDATE I.A.W W/O NO. 17218-AV-000161.',
      mechanicName: 'DAVID LEE',
      licenseNumber: 'FCC GROL / AV-87654',
      signature: 'DL 665'
    },
    {
      id: 3,
      date: '25/OCT/2024',
      seqNo: 'AVI-A-10-112',
      description: 'COMMUNICATION RADIO REPLACEMENT. INSTALLED NEW KING KY-196A TRANSCEIVER I.A.W W/O NO. 17218-AV-000085.',
      mechanicName: 'SARAH JOHNSON',
      licenseNumber: 'FCC GROL / AV-98762',
      signature: 'SJ 234'
    },
    {
      id: 4,
      date: '15/OCT/2024',
      seqNo: 'AVI-A-10-089',
      description: 'TRANSPONDER SYSTEM CHECK. MODE C ALTITUDE ENCODING VERIFICATION I.A.W W/O NO. 17218-AV-000042.',
      mechanicName: 'DAVID LEE',
      licenseNumber: 'FCC GROL / AV-87654',
      signature: 'DL 665'
    }
  ];

  // Engine logbook entries
  const engineLogEntries: EngineLogEntry[] = [
    {
      id: 1,
      date: '05/NOV/2024',
      tachTime: 6640.0,
      seqNo: 'ENG-A-12-001',
      engineTime: 1245.5,
      description: 'ENGINE OIL CHANGE AND FILTER REPLACEMENT. USED AEROSHELL W100 PLUS I.A.W W/O NO. 17218-E-000142.',
      mechanicName: 'MARIA GARCIA',
      licenseNumber: 'A&P / 176432 AMT',
      signature: 'MG 558'
    },
    {
      id: 2,
      date: '30/OCT/2024',
      tachTime: 6628.5,
      seqNo: 'ENG-A-11-098',
      engineTime: 1234.0,
      description: 'ENGINE COMPRESSION TEST. ALL CYLINDERS WITHIN LIMITS I.A.W W/O NO. 17218-E-000105.',
      mechanicName: 'JOHN SMITH',
      licenseNumber: 'A&P / 198745 AMT',
      signature: 'JS 442'
    },
    {
      id: 3,
      date: '18/OCT/2024',
      tachTime: 6610.0,
      seqNo: 'ENG-A-10-076',
      engineTime: 1215.5,
      description: 'FUEL INJECTION SYSTEM CLEANING AND FLOW CHECK I.A.W W/O NO. 17218-E-000055.',
      mechanicName: 'MARIA GARCIA',
      licenseNumber: 'A&P / 176432 AMT',
      signature: 'MG 558'
    },
    {
      id: 4,
      date: '13/NOV/2024',
      tachTime: 6660.5,
      seqNo: 'ENG-A-12-002',
      engineTime: 1266.0,
      description: 'ENGINE MOUNT INSPECTION. REPLACED FORWARD UPPER MOUNT BUSHINGS I.A.W W/O NO. 17218-E-000180.',
      mechanicName: 'ROBERT CHEN',
      licenseNumber: 'A&P / 203561 AMT',
      signature: 'RC 771'
    },
    {
      id: 5,
      date: '10/OCT/2024',
      tachTime: 6595.0,
      seqNo: 'ENG-A-10-045',
      engineTime: 1200.5,
      description: 'TURBOCHARGER OVERHAUL. REPLACED WASTEGATE ACTUATOR AND SEALS I.A.W W/O NO. 17218-E-000028.',
      mechanicName: 'JOHN SMITH',
      licenseNumber: 'A&P / 198745 AMT',
      signature: 'JS 442'
    }
  ];

  // Propeller logbook entries
  const propellerLogEntries: PropellerLogEntry[] = [
    {
      id: 1,
      date: '09/NOV/2024',
      seqNo: 'PROP-A-12-001',
      propellerTime: 1250.0,
      description: 'PROPELLER BALANCE CHECK. DYNAMIC BALANCING PERFORMED I.A.W W/O NO. 17218-P-000165.',
      mechanicName: 'DAVID LEE',
      licenseNumber: 'A&P / 187654 AMT',
      signature: 'DL 665'
    },
    {
      id: 2,
      date: '27/OCT/2024',
      seqNo: 'PROP-A-11-087',
      propellerTime: 1237.0,
      description: 'PROPELLER BLADE INSPECTION. CHECKED FOR NICKS, CRACKS, AND EROSION I.A.W W/O NO. 17218-P-000092.',
      mechanicName: 'MARIA GARCIA',
      licenseNumber: 'A&P / 176432 AMT',
      signature: 'MG 558'
    },
    {
      id: 3,
      date: '12/OCT/2024',
      seqNo: 'PROP-A-10-054',
      propellerTime: 1222.0,
      description: 'PROPELLER GOVERNOR ADJUSTMENT. ADJUSTED RPM SETTINGS TO SPECIFICATIONS I.A.W W/O NO. 17218-P-000035.',
      mechanicName: 'DAVID LEE',
      licenseNumber: 'A&P / 187654 AMT',
      signature: 'DL 665'
    },
    {
      id: 4,
      date: '11/NOV/2024',
      seqNo: 'PROP-A-12-002',
      propellerTime: 1252.5,
      description: 'PROPELLER DE-ICING SYSTEM TEST. VERIFIED PROPER OPERATION OF FLUID SYSTEM I.A.W W/O NO. 17218-P-000170.',
      mechanicName: 'ROBERT CHEN',
      licenseNumber: 'A&P / 203561 AMT',
      signature: 'RC 771'
    }
  ];

  // Mock data - in real app, this would be fetched based on aircraftId
  const allLogEntries: LogEntry[] = [
    // AIRFRAME entries
    {
      id: 1,
      date: '2024-11-10',
      workOrder: 'WO-2024-1150',
      description: '100-hour inspection completed',
      maintenanceType: 'Scheduled',
      technician: 'John Smith',
      hours: 8.5,
      status: 'Completed',
      category: 'AIRFRAME'
    },
    {
      id: 2,
      date: '2024-10-28',
      workOrder: 'WO-2024-1098',
      description: 'Landing gear inspection',
      maintenanceType: 'Scheduled',
      technician: 'Robert Chen',
      hours: 5.5,
      status: 'Completed',
      category: 'AIRFRAME'
    },
    {
      id: 3,
      date: '2024-10-20',
      workOrder: 'WO-2024-1067',
      description: 'Hydraulic system leak repair',
      maintenanceType: 'Unscheduled',
      technician: 'John Smith',
      hours: 12.0,
      status: 'Completed',
      category: 'AIRFRAME'
    },
    {
      id: 4,
      date: '2024-11-12',
      workOrder: 'WO-2024-1172',
      description: 'Wing flap actuator replacement',
      maintenanceType: 'Unscheduled',
      technician: 'Maria Garcia',
      hours: 6.5,
      status: 'Completed',
      category: 'AIRFRAME'
    },
    {
      id: 5,
      date: '2024-11-14',
      workOrder: 'WO-2024-1195',
      description: 'Fuselage skin corrosion treatment',
      maintenanceType: 'Scheduled',
      technician: 'Robert Chen',
      hours: 10.0,
      status: 'In Progress',
      category: 'AIRFRAME'
    },
    // AVIONICS entries
    {
      id: 6,
      date: '2024-11-14',
      workOrder: 'WO-2024-1189',
      description: 'Avionics software update',
      maintenanceType: 'Scheduled',
      technician: 'Sarah Johnson',
      hours: 4.0,
      status: 'In Progress',
      category: 'AVIONICS'
    },
    {
      id: 7,
      date: '2024-11-08',
      workOrder: 'WO-2024-1161',
      description: 'GPS navigation system calibration',
      maintenanceType: 'Scheduled',
      technician: 'David Lee',
      hours: 2.5,
      status: 'Completed',
      category: 'AVIONICS'
    },
    {
      id: 8,
      date: '2024-10-25',
      workOrder: 'WO-2024-1085',
      description: 'Communication radio replacement',
      maintenanceType: 'Unscheduled',
      technician: 'Sarah Johnson',
      hours: 5.0,
      status: 'Completed',
      category: 'AVIONICS'
    },
    {
      id: 9,
      date: '2024-10-15',
      workOrder: 'WO-2024-1042',
      description: 'Transponder system check',
      maintenanceType: 'Scheduled',
      technician: 'David Lee',
      hours: 1.5,
      status: 'Completed',
      category: 'AVIONICS'
    },
    // ENGINE entries
    {
      id: 10,
      date: '2024-11-05',
      workOrder: 'WO-2024-1142',
      description: 'Engine oil change and filter replacement',
      maintenanceType: 'Scheduled',
      technician: 'Maria Garcia',
      hours: 3.0,
      status: 'Completed',
      category: 'ENGINE'
    },
    {
      id: 11,
      date: '2024-10-30',
      workOrder: 'WO-2024-1105',
      description: 'Engine compression test',
      maintenanceType: 'Scheduled',
      technician: 'John Smith',
      hours: 4.5,
      status: 'Completed',
      category: 'ENGINE'
    },
    {
      id: 12,
      date: '2024-10-18',
      workOrder: 'WO-2024-1055',
      description: 'Fuel injection system cleaning',
      maintenanceType: 'Scheduled',
      technician: 'Maria Garcia',
      hours: 6.0,
      status: 'Completed',
      category: 'ENGINE'
    },
    {
      id: 13,
      date: '2024-11-13',
      workOrder: 'WO-2024-1180',
      description: 'Engine mount inspection',
      maintenanceType: 'Scheduled',
      technician: 'Robert Chen',
      hours: 3.5,
      status: 'In Progress',
      category: 'ENGINE'
    },
    {
      id: 14,
      date: '2024-10-10',
      workOrder: 'WO-2024-1028',
      description: 'Turbocharger overhaul',
      maintenanceType: 'Scheduled',
      technician: 'John Smith',
      hours: 16.0,
      status: 'Completed',
      category: 'ENGINE'
    },
    // PROPELLER entries
    {
      id: 15,
      date: '2024-11-09',
      workOrder: 'WO-2024-1165',
      description: 'Propeller balance check',
      maintenanceType: 'Scheduled',
      technician: 'David Lee',
      hours: 2.0,
      status: 'Completed',
      category: 'PROPELLER'
    },
    {
      id: 16,
      date: '2024-10-27',
      workOrder: 'WO-2024-1092',
      description: 'Propeller blade inspection',
      maintenanceType: 'Scheduled',
      technician: 'Maria Garcia',
      hours: 3.0,
      status: 'Completed',
      category: 'PROPELLER'
    },
    {
      id: 17,
      date: '2024-10-12',
      workOrder: 'WO-2024-1035',
      description: 'Propeller governor adjustment',
      maintenanceType: 'Unscheduled',
      technician: 'David Lee',
      hours: 4.0,
      status: 'Completed',
      category: 'PROPELLER'
    },
    {
      id: 18,
      date: '2024-11-11',
      workOrder: 'WO-2024-1170',
      description: 'Propeller de-icing system test',
      maintenanceType: 'Scheduled',
      technician: 'Robert Chen',
      hours: 2.5,
      status: 'Pending',
      category: 'PROPELLER'
    },
  ];

  // Get filtered entries based on active category and search
  const getFilteredEntries = () => {
    let entries: any[] = [];
    
    switch (activeCategory) {
      case 'AIRFRAME':
        entries = airframeLogEntries;
        break;
      case 'AVIONICS':
        entries = avionicsLogEntries;
        break;
      case 'ENGINE':
        entries = engineLogEntries;
        break;
      case 'PROPELLER':
        entries = propellerLogEntries;
        break;
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      entries = entries.filter(entry =>
        entry.description.toLowerCase().includes(query) ||
        entry.mechanicName.toLowerCase().includes(query) ||
        entry.date.toLowerCase().includes(query)
      );
    }

    return entries;
  };

  const filteredEntries = getFilteredEntries();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'Pending':
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const categories: Category[] = ['AIRFRAME', 'AVIONICS', 'ENGINE', 'PROPELLER'];

  // Get count for each category
  const getCategoryCount = (category: Category) => {
    switch (category) {
      case 'AIRFRAME':
        return airframeLogEntries.length;
      case 'AVIONICS':
        return avionicsLogEntries.length;
      case 'ENGINE':
        return engineLogEntries.length;
      case 'PROPELLER':
        return propellerLogEntries.length;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900">Maintenance Logbook</h2>
            <p className="text-gray-500 mt-1">Aircraft ID: {aircraftId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={() => setShowAddEntryModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex-1 px-6 py-4 text-sm transition-colors relative ${
                activeCategory === category
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{category}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeCategory === category
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {getCategoryCount(category)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by description, date, or mechanic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logbook List View */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-left text-gray-900 text-xs">Date</th>
                <th className="px-5 py-3 text-left text-gray-900 text-xs">Description</th>
                <th className="px-5 py-3 text-left text-gray-900 text-xs">Mechanic Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-500 text-sm">
                    No maintenance records found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (activeCategory === 'AIRFRAME') {
                        setSelectedAirframeEntry(entry as AirframeLogEntry);
                      } else if (activeCategory === 'AVIONICS') {
                        setSelectedAvionicsEntry(entry as AvionicsLogEntry);
                      } else if (activeCategory === 'ENGINE') {
                        setSelectedEngineEntry(entry as EngineLogEntry);
                      } else if (activeCategory === 'PROPELLER') {
                        setSelectedPropellerEntry(entry as PropellerLogEntry);
                      }
                    }}
                  >
                    <td className="px-5 py-4 text-gray-900 text-sm">{entry.date}</td>
                    <td className="px-5 py-4 text-gray-900 text-sm">{entry.description}</td>
                    <td className="px-5 py-4 text-gray-600 text-sm">{entry.mechanicName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail View Modal */}
      {selectedAirframeEntry && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const currentIndex = airframeLogEntries.findIndex(e => e.id === selectedAirframeEntry.id);
                    if (currentIndex > 0) {
                      setSelectedAirframeEntry(airframeLogEntries[currentIndex - 1]);
                    }
                  }}
                  disabled={airframeLogEntries.findIndex(e => e.id === selectedAirframeEntry.id) === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = airframeLogEntries.findIndex(e => e.id === selectedAirframeEntry.id);
                    if (currentIndex < airframeLogEntries.length - 1) {
                      setSelectedAirframeEntry(airframeLogEntries[currentIndex + 1]);
                    }
                  }}
                  disabled={airframeLogEntries.findIndex(e => e.id === selectedAirframeEntry.id) === airframeLogEntries.length - 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="px-4 py-2 bg-gray-700 text-white rounded text-sm">
                  Preview
                </button>
              </div>
              <button
                onClick={() => setSelectedAirframeEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">AIRFRAME LOGBOOK</h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">{selectedAirframeEntry.date}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">{selectedAirframeEntry.seqNo}</div>
                  </div>
                </div>

                {/* Tach Time and Airframe Time Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Tach Time:</div>
                    <div className="text-gray-900">{selectedAirframeEntry.tachTime}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Airframe Time:</div>
                    <div className="text-gray-900">{selectedAirframeEntry.airframeTime}</div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedAirframeEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Mechanic Name/License Number:</div>
                    <div className="text-gray-900">{selectedAirframeEntry.mechanicName}</div>
                    <div className="text-gray-700 text-sm">{selectedAirframeEntry.licenseNumber}</div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">Signature/Stamp</div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">{selectedAirframeEntry.signature}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach Image Button */}
              <div className="mt-6">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Attach Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AVIONICS Detail View Modal */}
      {selectedAvionicsEntry && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const currentIndex = avionicsLogEntries.findIndex(e => e.id === selectedAvionicsEntry.id);
                    if (currentIndex > 0) {
                      setSelectedAvionicsEntry(avionicsLogEntries[currentIndex - 1]);
                    }
                  }}
                  disabled={avionicsLogEntries.findIndex(e => e.id === selectedAvionicsEntry.id) === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = avionicsLogEntries.findIndex(e => e.id === selectedAvionicsEntry.id);
                    if (currentIndex < avionicsLogEntries.length - 1) {
                      setSelectedAvionicsEntry(avionicsLogEntries[currentIndex + 1]);
                    }
                  }}
                  disabled={avionicsLogEntries.findIndex(e => e.id === selectedAvionicsEntry.id) === avionicsLogEntries.length - 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="px-4 py-2 bg-gray-700 text-white rounded text-sm">
                  Preview
                </button>
              </div>
              <button
                onClick={() => setSelectedAvionicsEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">AVIONICS LOGBOOK</h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">{selectedAvionicsEntry.date}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">{selectedAvionicsEntry.seqNo}</div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedAvionicsEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Mechanic Name/License Number:</div>
                    <div className="text-gray-900">{selectedAvionicsEntry.mechanicName}</div>
                    <div className="text-gray-700 text-sm">{selectedAvionicsEntry.licenseNumber}</div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">Signature/Stamp</div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">{selectedAvionicsEntry.signature}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach Image Button */}
              <div className="mt-6">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Attach Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENGINE Detail View Modal */}
      {selectedEngineEntry && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const currentIndex = engineLogEntries.findIndex(e => e.id === selectedEngineEntry.id);
                    if (currentIndex > 0) {
                      setSelectedEngineEntry(engineLogEntries[currentIndex - 1]);
                    }
                  }}
                  disabled={engineLogEntries.findIndex(e => e.id === selectedEngineEntry.id) === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = engineLogEntries.findIndex(e => e.id === selectedEngineEntry.id);
                    if (currentIndex < engineLogEntries.length - 1) {
                      setSelectedEngineEntry(engineLogEntries[currentIndex + 1]);
                    }
                  }}
                  disabled={engineLogEntries.findIndex(e => e.id === selectedEngineEntry.id) === engineLogEntries.length - 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="px-4 py-2 bg-gray-700 text-white rounded text-sm">
                  Preview
                </button>
              </div>
              <button
                onClick={() => setSelectedEngineEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">ENGINE LOGBOOK</h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">{selectedEngineEntry.date}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">{selectedEngineEntry.seqNo}</div>
                  </div>
                </div>

                {/* Tach Time and Engine Time Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Tach Time:</div>
                    <div className="text-gray-900">{selectedEngineEntry.tachTime}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Engine Time:</div>
                    <div className="text-gray-900">{selectedEngineEntry.engineTime}</div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedEngineEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Mechanic Name/License Number:</div>
                    <div className="text-gray-900">{selectedEngineEntry.mechanicName}</div>
                    <div className="text-gray-700 text-sm">{selectedEngineEntry.licenseNumber}</div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">Signature/Stamp</div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">{selectedEngineEntry.signature}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach Image Button */}
              <div className="mt-6">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Attach Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROPELLER Detail View Modal */}
      {selectedPropellerEntry && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const currentIndex = propellerLogEntries.findIndex(e => e.id === selectedPropellerEntry.id);
                    if (currentIndex > 0) {
                      setSelectedPropellerEntry(propellerLogEntries[currentIndex - 1]);
                    }
                  }}
                  disabled={propellerLogEntries.findIndex(e => e.id === selectedPropellerEntry.id) === 0}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const currentIndex = propellerLogEntries.findIndex(e => e.id === selectedPropellerEntry.id);
                    if (currentIndex < propellerLogEntries.length - 1) {
                      setSelectedPropellerEntry(propellerLogEntries[currentIndex + 1]);
                    }
                  }}
                  disabled={propellerLogEntries.findIndex(e => e.id === selectedPropellerEntry.id) === propellerLogEntries.length - 1}
                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="px-4 py-2 bg-gray-700 text-white rounded text-sm">
                  Preview
                </button>
              </div>
              <button
                onClick={() => setSelectedPropellerEntry(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">PROPELLER LOGBOOK</h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Date:</div>
                    <div className="text-gray-900">{selectedPropellerEntry.date}</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-700 mb-1">Seq. No.</div>
                    <div className="text-red-700">{selectedPropellerEntry.seqNo}</div>
                  </div>
                </div>

                {/* Propeller Time Row */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-1">Propeller Time:</div>
                  <div className="text-gray-900">{selectedPropellerEntry.propellerTime}</div>
                </div>

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected at the back page of this logbook sequence)
                  </div>
                  <div className="text-gray-900 min-h-[60px] p-2">
                    {selectedPropellerEntry.description}
                  </div>
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <div className="text-xs text-gray-700 mb-1">Mechanic Name/License Number:</div>
                    <div className="text-gray-900">{selectedPropellerEntry.mechanicName}</div>
                    <div className="text-gray-700 text-sm">{selectedPropellerEntry.licenseNumber}</div>
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">Signature/Stamp</div>
                      <div className="border-2 border-gray-900 px-4 py-2 inline-block">
                        <div className="text-gray-900">{selectedPropellerEntry.signature}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach Image Button */}
              <div className="mt-6">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Attach Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntryModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-gray-900">Add New Entry</h2>
              <button
                onClick={() => setShowAddEntryModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-300 py-3 px-5 text-center">
                  <h3 className="text-gray-900 tracking-wide">{activeCategory} LOGBOOK</h3>
                </div>

                {/* Date and Seq Info Row */}
                <div className="grid grid-cols-2 border-b border-gray-300">
                  <div className="border-r border-gray-300 p-4">
                    <label className="text-xs text-gray-700 mb-1 block">Date:</label>
                    <input
                      type="text"
                      className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="p-4">
                    <label className="text-xs text-gray-700 mb-1 block">Seq. No.</label>
                    <input
                      type="text"
                      className="w-full border-0 p-0 text-red-700 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                {/* Time Fields Row - Dynamic based on category */}
                {activeCategory === 'AIRFRAME' && (
                  <div className="grid grid-cols-2 border-b border-gray-300">
                    <div className="border-r border-gray-300 p-4">
                      <label className="text-xs text-gray-700 mb-1 block">Tach Time:</label>
                      <input
                        type="text"
                        className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                      />
                    </div>
                    <div className="p-4">
                      <label className="text-xs text-gray-700 mb-1 block">Airframe Time:</label>
                      <input
                        type="text"
                        className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>
                )}
                {activeCategory === 'ENGINE' && (
                  <div className="grid grid-cols-2 border-b border-gray-300">
                    <div className="border-r border-gray-300 p-4">
                      <label className="text-xs text-gray-700 mb-1 block">Tach Time:</label>
                      <input
                        type="text"
                        className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                      />
                    </div>
                    <div className="p-4">
                      <label className="text-xs text-gray-700 mb-1 block">Engine Time:</label>
                      <input
                        type="text"
                        className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>
                )}
                {activeCategory === 'PROPELLER' && (
                  <div className="border-b border-gray-300 p-4">
                    <label className="text-xs text-gray-700 mb-1 block">Propeller Time:</label>
                    <input
                      type="text"
                      className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0"
                    />
                  </div>
                )}

                {/* Description Section */}
                <div className="border-b border-gray-300 p-4">
                  <div className="text-xs text-gray-700 mb-2">
                    DESCRIPTION OF INSPECTIONS, TESTS, REPAIRS, AND ALTERATIONS
                  </div>
                  <div className="text-xs text-gray-500 italic mb-2">
                    (Record of component removal/installation shall be reflected at the back page of this logbook sequence)
                  </div>
                  <textarea
                    rows={4}
                    className="w-full border-0 p-2 text-gray-900 focus:outline-none focus:ring-0 resize-none"
                  />
                </div>

                {/* Mechanic and Signature Row */}
                <div className="grid grid-cols-2">
                  <div className="border-r border-gray-300 p-4">
                    <label className="text-xs text-gray-700 mb-1 block">Mechanic Name/License Number:</label>
                    <input
                      type="text"
                      className="w-full border-0 p-0 text-gray-900 focus:outline-none focus:ring-0 mb-2"
                    />
                    <input
                      type="text"
                      className="w-full border-0 p-0 text-gray-700 text-sm focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-700 mb-2">Signature/Stamp</div>
                      <input
                        type="text"
                        className="border-2 border-gray-900 px-4 py-2 text-center text-gray-900 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Attach Image Button */}
              <div className="mt-6 flex items-center justify-between">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Attach Image
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddEntryModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle save logic here
                      setShowAddEntryModal(false);
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
