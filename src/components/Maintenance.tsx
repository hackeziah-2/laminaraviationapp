import { ArrowLeft, Plus, Calendar, AlertTriangle, CheckCircle, Search, Download, Printer, X, FileText, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, Loader } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ADWorkOrders } from './ADWorkOrders';
import { CPCPMonitoring } from './CPCPMonitoring';
import {
  getAircraftLdndMonitoring,
  getAircraftLdndMonitoringLatest,
  createAircraftLdndMonitoring,
  updateAircraftLdndMonitoring,
  deleteAircraftLdndMonitoring,
  type LDNDMonitoring,
  type LDNDLatest,
} from '../api/ldndMonitoringApi';
import {
  getAircraftAdMonitoring,
  createAircraftAdMonitoring,
  updateAircraftAdMonitoring,
  deleteAircraftAdMonitoring,
  type ADMonitoring,
} from '../api/adMonitoringApi';
import { Spinner } from './ui/spinner';
import Swal from 'sweetalert2';

interface LDNDItem {
  id: number;
  type: string;
  unit: string;
  lastDoneTachDue: number | null;
  lastDoneTachDone: number | null;
  nextDueTachHours: number | null;
  performedDateStart: string | null;
}

interface ADItem {
  id: number;
  adNumber: string;
  subject: string;
  status: 'Active' | 'Compliant' | 'Superseded';
  inspectionInterval: string;
  complianceRequired: string;
  workOrders: number;
  dateViewed: string;
}

interface TCCItem {
  id: number;
  msn: number;
  tsn: number;
  csn: number;
  components: number;
  status: 'Current' | 'Due Soon' | 'Critical';
}

interface CPCPItem {
  id: number;
  msn: string;
  aftf: string;
  totalInspections: number;
  nextDue: string;
  status: 'Current' | 'Due Soon' | 'Overdue';
}

type MaintenanceCategory = 'LDND' | 'AD' | 'TCC' | 'CPCP';

const PATH_TO_CATEGORY: Record<string, MaintenanceCategory> = {
  'maintenance-ldnd': 'LDND',
  'maintenance-ad': 'AD',
  'maintenance-tcc': 'TCC',
  'maintenance-cpcp': 'CPCP',
};

export function Maintenance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const aircraftId = parseInt(id || '1');

  // Derive active category from URL path (profile/:id/maintenance-ldnd -> LDND, etc.)
  const pathSegment = location.pathname.split('/').filter(Boolean);
  const maintenanceSegment = pathSegment[2]; // profile, id, maintenance-ldnd
  const activeCategoryFromUrl = (maintenanceSegment && PATH_TO_CATEGORY[maintenanceSegment]) || 'LDND';

  /** Format LDND Last Updated to YYYY-MM-DD */
  const formatLdndLastUpdated = (value: string | null | undefined): string => {
    if (value == null || String(value).trim() === '') return '—';
    const s = String(value).trim();
    const dateOnly = /^\d{4}-\d{2}-\d{2}/.exec(s);
    if (dateOnly) return dateOnly[0];
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleBack = () => {
    navigate('/profile');
  };

  const handleViewTCC = (msn: number) => {
    navigate(`/profile/${id}/maintenance-tcc/${msn}`);
  };

  const handleViewCPCP = (msn: string) => {
    navigate(`/profile/${id}/maintenance-cpcp/${msn}`);
  };

  const handleViewADWorkOrders = (adMonitoringId: number) => {
    navigate(`/profile/${id}/maintenance-ad-work-orders/${adMonitoringId}`);
  };

  const handleTabClick = (category: MaintenanceCategory) => {
    const path = { LDND: 'maintenance-ldnd', AD: 'maintenance-ad', TCC: 'maintenance-tcc', CPCP: 'maintenance-cpcp' }[category];
    navigate(`/profile/${id}/${path}`);
    setActiveCategory(category);
    setLdndSearchQuery('');
    setAdSearchQuery('');
    setCurrentPage(1);
    setAdCurrentPage(1);
  };

  const [activeCategory, setActiveCategory] = useState<MaintenanceCategory>(activeCategoryFromUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [ldndSearchQuery, setLdndSearchQuery] = useState('');
  const [adSearchQuery, setAdSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showADModal, setShowADModal] = useState(false);
  const [showTCCModal, setShowTCCModal] = useState(false);
  const [selectedAD, setSelectedAD] = useState<string | null>(null);
  const [showCPCPMonitoring, setShowCPCPMonitoring] = useState(false);
  const [selectedCPCPMsn, setSelectedCPCPMsn] = useState<string>('');
  const [tccFormData, setTccFormData] = useState({
    msn: '',
    tsn: '',
    csn: ''
  });
  
  // Pagination state for LDND
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Pagination state for AD
  const [adCurrentPage, setAdCurrentPage] = useState(1);
  const [adItemsPerPage, setAdItemsPerPage] = useState(10);
  
  // Add Entry form state for LDND (matches backend: inspection_type, unit, last_done_tach_due, last_done_tach_done, next_due_tach_hours, performed_date_start)
  const [newEntry, setNewEntry] = useState({
    type: '',
    unit: 'HRS' as 'HRS' | 'CYCLES',
    lastDoneTachDue: '',
    lastDoneTachDone: '',
    nextDueTachHours: '',
    performedDateStart: ''
  });

  // Add Entry form state for AD
  const [newADEntry, setNewADEntry] = useState({
    adNumber: '',
    subject: '',
    inspectionInterval: '',
    compliDate: ''
  });

  // LDND API state
  const [ldndItems, setLdndItems] = useState<LDNDMonitoring[]>([]);
  const [ldndLoading, setLdndLoading] = useState(false);
  const [ldndError, setLdndError] = useState<string | null>(null);
  const [ldndTotal, setLdndTotal] = useState(0);
  const [ldndPages, setLdndPages] = useState(0);
  const [editingLdndEntry, setEditingLdndEntry] = useState<LDNDMonitoring | null>(null);
  const [ldndSaving, setLdndSaving] = useState(false);
  const [ldndLatest, setLdndLatest] = useState<LDNDLatest | null>(null);
  const [ldndLatestLoading, setLdndLatestLoading] = useState(false);

  // AD API state
  const [adItems, setAdItems] = useState<ADMonitoring[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adTotal, setAdTotal] = useState(0);
  const [adPages, setAdPages] = useState(0);
  const [editingADEntry, setEditingADEntry] = useState<ADMonitoring | null>(null);
  const [adSaving, setAdSaving] = useState(false);

  const fetchLdnd = useCallback(async () => {
    if (!aircraftId || activeCategory !== 'LDND') return;
    setLdndLoading(true);
    setLdndError(null);
    try {
      const res = await getAircraftLdndMonitoring(aircraftId, currentPage, itemsPerPage, ldndSearchQuery);
      setLdndItems(res.items);
      setLdndTotal(res.total);
      setLdndPages(res.pages);
    } catch (err: any) {
      console.error('LDND fetch error:', err);
      setLdndError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load LDND records');
      setLdndItems([]);
    } finally {
      setLdndLoading(false);
    }
  }, [aircraftId, activeCategory, currentPage, itemsPerPage, ldndSearchQuery]);

  const fetchLdndLatest = useCallback(async () => {
    if (!aircraftId || activeCategory !== 'LDND') return;
    setLdndLatestLoading(true);
    try {
      const latest = await getAircraftLdndMonitoringLatest(aircraftId);
      setLdndLatest(latest);
    } catch (err: any) {
      console.error('LDND latest fetch error:', err);
      setLdndLatest(null);
    } finally {
      setLdndLatestLoading(false);
    }
  }, [aircraftId, activeCategory]);

  useEffect(() => {
    if (activeCategory === 'LDND') fetchLdndLatest();
  }, [activeCategory, fetchLdndLatest]);

  const fetchAd = useCallback(async () => {
    if (!aircraftId || activeCategory !== 'AD') return;
    setAdLoading(true);
    setAdError(null);
    try {
      const res = await getAircraftAdMonitoring(aircraftId, adCurrentPage, adItemsPerPage, adSearchQuery);
      setAdItems(res.items);
      setAdTotal(res.total);
      setAdPages(res.pages);
    } catch (err: any) {
      console.error('AD fetch error:', err);
      setAdError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load AD records');
      setAdItems([]);
    } finally {
      setAdLoading(false);
    }
  }, [aircraftId, activeCategory, adCurrentPage, adItemsPerPage, adSearchQuery]);

  useEffect(() => {
    if (activeCategory === 'LDND') fetchLdnd();
  }, [activeCategory, fetchLdnd]);

  useEffect(() => {
    if (activeCategory === 'AD') fetchAd();
  }, [activeCategory, fetchAd]);

  // Keep activeCategory in sync with URL when user navigates (e.g. back button)
  useEffect(() => {
    setActiveCategory(activeCategoryFromUrl);
  }, [activeCategoryFromUrl]);

  useEffect(() => { setCurrentPage(1); }, [ldndSearchQuery]);
  useEffect(() => { setAdCurrentPage(1); }, [adSearchQuery]);

  const handleLdndCreateOrUpdate = async () => {
    const type = String(newEntry.type).trim();
    if (!type) {
      await Swal.fire({ icon: 'warning', title: 'Required', text: 'Inspection Type is required.' });
      return;
    }
    setLdndSaving(true);
    try {
      const payload = {
        type,
        unit: newEntry.unit,
        lastDoneTachDue: newEntry.lastDoneTachDue === '' ? null : Number(newEntry.lastDoneTachDue),
        lastDoneTachDone: newEntry.lastDoneTachDone === '' ? null : Number(newEntry.lastDoneTachDone),
        nextDueTachHours: newEntry.nextDueTachHours === '' ? null : Number(newEntry.nextDueTachHours),
        performedDateStart: newEntry.performedDateStart?.trim() || null,
      };
      if (editingLdndEntry) {
        await updateAircraftLdndMonitoring(aircraftId, editingLdndEntry.id, payload);
      } else {
        await createAircraftLdndMonitoring(aircraftId, payload);
      }
      setShowAddModal(false);
      setEditingLdndEntry(null);
      setNewEntry({ type: '', unit: 'HRS', lastDoneTachDue: '', lastDoneTachDone: '', nextDueTachHours: '', performedDateStart: '' });
      await fetchLdnd();
      await fetchLdndLatest();
      await Swal.fire({ icon: 'success', title: editingLdndEntry ? 'Updated!' : 'Saved!', text: 'LDND entry saved.' });
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.detail ?? err?.message ?? 'Failed to save.' });
    } finally {
      setLdndSaving(false);
    }
  };

  const handleLdndDelete = async (item: LDNDMonitoring) => {
    const result = await Swal.fire({
      title: 'Delete LDND Entry?',
      text: `Type: ${item.type}. You won't be able to revert this.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAircraftLdndMonitoring(aircraftId, item.id);
      await fetchLdnd();
      await fetchLdndLatest();
      await Swal.fire({ icon: 'success', title: 'Deleted!', text: 'LDND entry deleted.' });
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.detail ?? err?.message ?? 'Failed to delete.' });
    }
  };

  const openEditLdnd = (item: LDNDMonitoring) => {
    setEditingLdndEntry(item);
    setNewEntry({
      type: item.inspectionType || item.type,
      unit: (item.unit === 'CYCLES' ? 'CYCLES' : 'HRS') as 'HRS' | 'CYCLES',
      lastDoneTachDue: item.lastDoneTachDue != null ? String(item.lastDoneTachDue) : '',
      lastDoneTachDone: item.lastDoneTachDone != null ? String(item.lastDoneTachDone) : '',
      nextDueTachHours: item.nextDueTachHours != null ? String(item.nextDueTachHours) : '',
      performedDateStart: item.performedDateStart ?? '',
    });
    setShowAddModal(true);
  };

  const handleADCreateOrUpdate = async () => {
    const adNumber = String(newADEntry.adNumber).trim();
    const subject = String(newADEntry.subject).trim();
    if (!adNumber || !subject) {
      await Swal.fire({ icon: 'warning', title: 'Required fields', text: 'Please fill AD Number and Subject.' });
      return;
    }
    setAdSaving(true);
    try {
      if (editingADEntry) {
        await updateAircraftAdMonitoring(aircraftId, editingADEntry.id, {
          adNumber,
          subject,
          inspectionInterval: newADEntry.inspectionInterval ?? '',
          compliDate: newADEntry.compliDate ?? '',
        });
      } else {
        await createAircraftAdMonitoring(aircraftId, {
          adNumber,
          subject,
          inspectionInterval: newADEntry.inspectionInterval ?? '',
          compliDate: newADEntry.compliDate ?? '',
        });
      }
      setShowADModal(false);
      setEditingADEntry(null);
      setNewADEntry({ adNumber: '', subject: '', inspectionInterval: '', compliDate: '' });
      await fetchAd();
      await Swal.fire({ icon: 'success', title: editingADEntry ? 'Updated!' : 'Saved!', text: 'Airworthiness Directive saved.' });
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.message ?? 'Failed to save.';
      await Swal.fire({ icon: 'error', title: 'Error', text: msg });
    } finally {
      setAdSaving(false);
    }
  };

  const handleADDelete = async (item: ADMonitoring) => {
    const result = await Swal.fire({
      title: 'Delete Airworthiness Directive?',
      text: `"${item.adNumber}" — ${item.subject}. You won't be able to revert this.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAircraftAdMonitoring(aircraftId, item.id);
      await fetchAd();
      await Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Airworthiness Directive deleted.' });
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Error', text: err?.response?.data?.detail ?? err?.message ?? 'Failed to delete.' });
    }
  };

  const openEditAD = (item: ADMonitoring) => {
    setEditingADEntry(item);
    setNewADEntry({
      adNumber: item.adNumber,
      subject: item.subject,
      inspectionInterval: item.inspectionInterval || '',
      compliDate: item.compliDate ? item.compliDate.slice(0, 10) : '',
    });
    setShowADModal(true);
  };

  const totalPages = ldndPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, ldndTotal);
  const paginatedLDNDItems = ldndItems;

  const adTotalPages = adPages;
  const adStartIndex = (adCurrentPage - 1) * adItemsPerPage;
  const adEndIndex = Math.min(adStartIndex + adItemsPerPage, adTotal);
  const paginatedADItems = adItems;

  // TCC Forecasting Data
  const tccItems: TCCItem[] = [
    {
      id: 1,
      msn: 17263830,
      tsn: 4811.7,
      csn: 1549.2,
      components: 12,
      status: 'Current'
    },
    {
      id: 2,
      msn: 17263831,
      tsn: 5100.5,
      csn: 1623.8,
      components: 8,
      status: 'Current'
    },
    {
      id: 3,
      msn: 17263832,
      tsn: 6580.0,
      csn: 2145.3,
      components: 15,
      status: 'Current'
    },
    {
      id: 4,
      msn: 17263833,
      tsn: 3250.5,
      csn: 1025.7,
      components: 6,
      status: 'Due Soon'
    },
    {
      id: 5,
      msn: 17263834,
      tsn: 1890.3,
      csn: 742.1,
      components: 4,
      status: 'Critical'
    },
    {
      id: 6,
      msn: 17263835,
      tsn: 7245.8,
      csn: 2387.9,
      components: 18,
      status: 'Current'
    }
  ];

  // CPCP Forecasting Data
  const cpcpItems: CPCPItem[] = [
    {
      id: 1,
      msn: '17XXXX4',
      aftf: '7984 H',
      totalInspections: 10,
      nextDue: '15-Dec-25',
      status: 'Current'
    },
    {
      id: 2,
      msn: '11-03156-26A',
      aftf: '7830 H',
      totalInspections: 12,
      nextDue: '20-Nov-25',
      status: 'Due Soon'
    },
    {
      id: 3,
      msn: '11-03210-30B',
      aftf: '6543 H',
      totalInspections: 8,
      nextDue: '05-Oct-25',
      status: 'Overdue'
    },
    {
      id: 4,
      msn: '11-04567-42C',
      aftf: '5234 H',
      totalInspections: 15,
      nextDue: '18-Jan-26',
      status: 'Current'
    },
    {
      id: 5,
      msn: '11-05678-55D',
      aftf: '8932 H',
      totalInspections: 14,
      nextDue: '22-Jan-26',
      status: 'Current'
    }
  ];

  // Filter logic
  const getFilteredItems = () => {
    let items: any[] = [];
    
    switch (activeCategory) {
      case 'LDND':
        items = ldndItems;
        break;
      case 'AD':
        items = adItems;
        break;
      case 'TCC':
        items = tccItems;
        break;
      case 'CPCP':
        items = cpcpItems;
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const searchableText = Object.values(item).join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    return items;
  };

  const filteredItems = getFilteredItems();

  // Status color functions
  const getLDNDStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'Due Soon':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'Current':
        return 'bg-green-100 text-green-800 border border-green-300';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getADStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'Due Soon':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'Compliant':
        return 'bg-green-100 text-green-800 border border-green-300';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getTCCStatusColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'Due Soon':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'Current':
        return 'bg-green-100 text-green-800 border border-green-300';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getCPCPStatusColor = (status: string) => {
    switch (status) {
      case 'Overdue':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'Due Soon':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'Current':
        return 'bg-green-100 text-green-800 border border-green-300';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  // Get counts for each category
  const getCounts = () => {
    switch (activeCategory) {
      case 'LDND':
        return {
          critical: 0,
          warning: 0,
          good: ldndItems.length
        };
      case 'AD':
        return {
          critical: adItems.filter(i => i.status === 'Overdue').length,
          warning: adItems.filter(i => i.status === 'Due Soon').length,
          good: adItems.filter(i => i.status === 'Compliant').length
        };
      case 'TCC':
        return {
          critical: tccItems.filter(i => i.status === 'Critical').length,
          warning: tccItems.filter(i => i.status === 'Due Soon').length,
          good: tccItems.filter(i => i.status === 'Current').length
        };
      case 'CPCP':
        return {
          critical: cpcpItems.filter(i => i.status === 'Overdue').length,
          warning: cpcpItems.filter(i => i.status === 'Due Soon').length,
          good: cpcpItems.filter(i => i.status === 'Current').length
        };
    }
  };

  const counts = getCounts();

  const categories = [
    { key: 'LDND' as MaintenanceCategory, label: 'LDND', fullName: 'Last Done Next Due' },
    { key: 'AD' as MaintenanceCategory, label: 'AD Forecasting', fullName: 'Airworthiness Directives' },
    { key: 'TCC' as MaintenanceCategory, label: 'TCC Forecasting', fullName: 'Time Controlled Components' },
    { key: 'CPCP' as MaintenanceCategory, label: 'CPCP Forecasting', fullName: 'Corrosion Prevention & Control Program' }
  ];





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
          <div>
            <h2 className="text-gray-900 text-lg sm:text-xl">Maintenance Forecasting</h2>
            <p className="text-gray-500 mt-1 text-sm">Aircraft ID: {aircraftId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => handleTabClick(category.key)}
              className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm transition-colors relative whitespace-nowrap ${
                activeCategory === category.key
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>{category.label}</span>
                <span className="text-xs text-gray-500 hidden sm:inline">{category.fullName}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Summary Cards - hide for LDND and AD */}
        {activeCategory !== 'LDND' && activeCategory !== 'AD' && (
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-xs mb-1">
                      {activeCategory === 'CPCP' ? 'Overdue' : activeCategory === 'TCC' ? 'Critical' : 'Overdue'}
                    </p>
                    <p className="text-red-900 text-2xl">{counts.critical}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 text-xs mb-1">Due Soon</p>
                    <p className="text-yellow-900 text-2xl">{counts.warning}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-xs mb-1">Current</p>
                    <p className="text-green-900 text-2xl">{counts.good}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LDND Section */}
        {activeCategory === 'LDND' && (
          <>
            {/* Info Cards – from api/v1/aircraft/{aircraft_id}/ldnd-monitoring/latest */}
            <div className="p-5 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">Current Tach</div>
                  <div className="text-gray-900 text-lg">
                    {ldndLatestLoading ? <Loader className="w-5 h-5 animate-spin text-gray-400 inline" /> : (ldndLatest?.currentTach != null && ldndLatest.currentTach !== '' ? String(ldndLatest.currentTach) : '—')}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">Next Inspection</div>
                  <div className="text-gray-900 text-lg">
                    {ldndLatestLoading ? <Loader className="w-5 h-5 animate-spin text-gray-400 inline" /> : [ldndLatest?.nextInspectionType, ldndLatest?.nextInspectionUnit].filter(Boolean).join(' ') || '—'}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                  <div className="text-gray-900 text-lg">
                    {ldndLatestLoading ? <Loader className="w-5 h-5 animate-spin text-gray-400 inline" /> : formatLdndLastUpdated(ldndLatest?.lastUpdated)}
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar and Add Entry Button for LDND */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by type, unit, tach, date..."
                    value={ldndSearchQuery}
                    onChange={(e) => {
                      setLdndSearchQuery(e.target.value);
                      setCurrentPage(1); // Reset to first page on search
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  onClick={() => { setEditingLdndEntry(null); setNewEntry({ type: '', unit: 'HRS', lastDoneTachDue: '', lastDoneTachDone: '', nextDueTachHours: '', performedDateStart: '' }); setShowAddModal(true); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </div>
            </div>

            {/* Inspection History Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 text-sm">Inspection History</div>
              <div className="text-gray-500 text-xs">
                Showing {ldndTotal > 0 ? startIndex + 1 : 0} to {endIndex} of {ldndTotal} records | Items per page: {itemsPerPage}
              </div>
            </div>

            {ldndError && (
              <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100 flex items-center justify-between gap-2">
                <span>{ldndError}</span>
                <button type="button" onClick={() => { setLdndError(null); fetchLdnd(); }} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded">Retry</button>
              </div>
            )}

            {/* LDND Table */}
            <div className="overflow-x-auto">
              {ldndLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : (
              <table className="w-full">
                <thead>
                  {/* Red Header with LAST DONE and column groups */}
                  <tr style={{ backgroundColor: '#EF4444' }}>
                    <th colSpan={1} className="px-3 py-2 text-left text-white text-xs">INSPECTION TYPE</th>
                    <th colSpan={3} className="px-3 py-2 text-center text-white text-xs border-l border-white/30">LAST DONE</th>
                    <th colSpan={1} className="px-3 py-2 text-center text-white text-xs border-l border-white/30">DATE PERFORMED</th>
                    <th colSpan={1} className="px-3 py-2 text-center text-white text-xs border-l border-white/30">NEXT DUE</th>
                    <th colSpan={1} className="px-3 py-2 text-center text-white text-xs border-l border-white/30">ACTIONS</th>
                  </tr>
                  {/* Light green header with specific columns */}
                  <tr style={{ backgroundColor: '#D1F4E0' }}>
                    <th className="px-3 py-2 text-left text-gray-900 text-xs">TYPE</th>
                    <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">UNIT</th>
                    <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">LAST DONE TACH DUE</th>
                    <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">LAST DONE TACH DONE</th>
                    <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">PERFORMED DATE START</th>
                    <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">NEXT DUE TACH HOURS</th>
                    <th className="px-3 py-2 text-center text-gray-900 text-xs border-l border-gray-300">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLDNDItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-500 text-sm">
                        No records found. Add an entry to get started.
                      </td>
                    </tr>
                  ) : (
                    paginatedLDNDItems.map((item) => (
                      <tr key={item.id} style={{ backgroundColor: '#E8F5E9' }} className="border-b border-gray-200">
                        <td className="px-3 py-2 text-gray-900 text-sm">{item.type}</td>
                        <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">{item.unit}</td>
                        <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">{item.lastDoneTachDue ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">{item.lastDoneTachDone ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">{item.performedDateStart ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">{item.nextDueTachHours ?? '—'}</td>
                        <td className="px-3 py-2 text-center border-l border-gray-300">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => openEditLdnd(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleLdndDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>

            {/* Pagination */}
            {ldndTotal > 0 && !ldndLoading && (
              <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || ldndLoading} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <span className="text-sm text-gray-600">Page {currentPage} of {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))} disabled={currentPage >= (totalPages || 1) || ldndLoading} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            )}
          </>
        )}

        {/* Search for TCC with Add Entry button */}
        {activeCategory === 'TCC' && (
          <div className="p-5 border-b border-gray-200">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button 
                onClick={() => setShowTCCModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>
          </div>
        )}

        {/* Search - only show for CPCP category */}
        {activeCategory === 'CPCP' && (
          <div className="p-5 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* AD Forecasting Section */}
        {activeCategory === 'AD' && (
          <>
            {/* Search Bar and Add Entry Button for AD */}
            <div className="p-5 border-b border-gray-200">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by AD number, subject, status..."
                    value={adSearchQuery}
                    onChange={(e) => {
                      setAdSearchQuery(e.target.value);
                      setAdCurrentPage(1); // Reset to first page on search
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button 
                  onClick={() => { setEditingADEntry(null); setNewADEntry({ adNumber: '', subject: '', inspectionInterval: '', compliDate: '' }); setShowADModal(true); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </div>
            </div>

            {/* Table Header with Record Count */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900">Airworthiness Directives</div>
              <div className="text-gray-500 text-xs">
                Showing {adTotal > 0 ? adStartIndex + 1 : 0} to {adEndIndex} of {adTotal} records
              </div>
            </div>

            {adError && (
              <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100 flex items-center justify-between gap-2">
                <span>{adError}</span>
                <button type="button" onClick={() => { setAdError(null); fetchAd(); }} className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded">Retry</button>
              </div>
            )}

            {/* AD Table */}
            <div className="overflow-x-auto">
              {adLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">AD Number</th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">Subject</th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">Inspection Interval</th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">Compli Date</th>
                    <th className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider">Work Orders</th>
                    <th className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedADItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500 text-sm">
                        No records found. Add an entry to get started.
                      </td>
                    </tr>
                  ) : (
                    paginatedADItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-gray-900 text-sm">{item.adNumber}</td>
                        <td className="px-5 py-4 text-gray-900 text-sm">{item.subject}</td>
                        <td className="px-5 py-4 text-gray-600 text-sm">{item.inspectionInterval}</td>
                        <td className="px-5 py-4 text-gray-600 text-sm">{item.compliDate}</td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => handleViewADWorkOrders(item.id)} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{item.workOrders}</span>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button type="button" onClick={() => openEditAD(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button type="button" onClick={() => handleADDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            <button onClick={() => handleViewADWorkOrders(item.id)} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm"><Eye className="w-4 h-4" />View</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>

            {/* Pagination Controls */}
            {adTotal > 0 && !adLoading && (
              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
                <button onClick={() => setAdCurrentPage(prev => Math.max(1, prev - 1))} disabled={adCurrentPage === 1 || adLoading} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <span className="text-sm text-gray-600">Page {adCurrentPage} of {adTotalPages || 1}</span>
                <button onClick={() => setAdCurrentPage(prev => Math.min(adTotalPages || 1, prev + 1))} disabled={adCurrentPage >= (adTotalPages || 1) || adLoading} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            )}
          </>
        )}

        {/* TCC Forecasting Table */}
        {activeCategory === 'TCC' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">MSN</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">TSN</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">CSN</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">Components</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">Status</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-gray-500 text-sm">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  (filteredItems as TCCItem[]).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.msn}</td>
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.tsn}</td>
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.csn}</td>
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.components}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded text-xs ${getTCCStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button 
                          onClick={() => handleViewTCC(item.msn)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* CPCP Forecasting Table */}
        {activeCategory === 'CPCP' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">MSN</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">AFTF</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">Total Inspections</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">Next Due</th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-sm">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  (filteredItems as CPCPItem[]).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.msn}</td>
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.aftf}</td>
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.totalInspections}</td>
                      <td className="px-5 py-4 text-gray-900 text-sm">{item.nextDue}</td>
                      <td className="px-5 py-4">
                        <button 
                          onClick={() => handleViewCPCP(item.msn)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Entry Modal for LDND with Frosted Glass Overlay */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900">{editingLdndEntry ? 'Edit Entry' : 'Add New Entry'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-4 gap-6">
                {/* Column 1: INSPECTION TYPE */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Inspection Type
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">Type</label>
                    <input
                      type="text"
                      value={newEntry.type}
                      onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                      placeholder="e.g., 5H"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 2: LAST DONE (last_done_tach_due, last_done_tach_done) */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Last Done
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">Unit (HRS / CYCLES)</label>
                      <select
                        value={newEntry.unit}
                        onChange={(e) => setNewEntry({ ...newEntry, unit: e.target.value as 'HRS' | 'CYCLES' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1.5em 1.5em',
                          paddingRight: '2.5rem'
                        }}
                      >
                        <option value="HRS">HRS</option>
                        <option value="CYCLES">CYCLES</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">Last Done Tach Due</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.lastDoneTachDue}
                        onChange={(e) => setNewEntry({ ...newEntry, lastDoneTachDue: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">Last Done Tach Done</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.lastDoneTachDone}
                        onChange={(e) => setNewEntry({ ...newEntry, lastDoneTachDone: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 3: DATE PERFORMED (performed_date_start) */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Date Performed
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">Performed Date Start</label>
                    <input
                      type="date"
                      value={newEntry.performedDateStart || ''}
                      onChange={(e) => setNewEntry({ ...newEntry, performedDateStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 4: NEXT DUE (next_due_tach_hours) */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Next Due
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">Next Due Tach Hours</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newEntry.nextDueTachHours}
                      onChange={(e) => setNewEntry({ ...newEntry, nextDueTachHours: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setShowAddModal(false)} disabled={ldndSaving} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleLdndCreateOrUpdate} disabled={ldndSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50">
                {ldndSaving ? 'Saving...' : editingLdndEntry ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal for AD with Frosted Glass Overlay */}
      {showADModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={() => setShowADModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900">{editingADEntry ? 'Edit Airworthiness Directive' : 'Add New Airworthiness Directive'}</h3>
              <button onClick={() => setShowADModal(false)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-4 gap-6">
                {/* Column 1: AD NUMBER */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    AD Number
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">AD Number</label>
                    <input
                      type="text"
                      value={newADEntry.adNumber}
                      onChange={(e) => setNewADEntry({ ...newADEntry, adNumber: e.target.value })}
                      placeholder="e.g., AD 2023-01-15"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 2: SUBJECT */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Subject
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={newADEntry.subject}
                      onChange={(e) => setNewADEntry({ ...newADEntry, subject: e.target.value })}
                      placeholder="Enter subject"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 3: INSPECTION INTERVAL */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Inspection Interval
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">Interval</label>
                    <input
                      type="text"
                      value={newADEntry.inspectionInterval}
                      onChange={(e) => setNewADEntry({ ...newADEntry, inspectionInterval: e.target.value })}
                      placeholder="e.g., 500 FH"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 4: COMPLIANCE DATE */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Compliance Date
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">Date</label>
                    <input
                      type="date"
                      value={newADEntry.compliDate}
                      onChange={(e) => setNewADEntry({ ...newADEntry, compliDate: e.target.value })}
                      placeholder="e.g., 15-Dec-2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setShowADModal(false)} disabled={adSaving} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleADCreateOrUpdate} disabled={adSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50">
                {adSaving ? 'Saving...' : editingADEntry ? 'Update Entry' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal for TCC with Frosted Glass Overlay */}
      {showTCCModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900">Add TCC Entry</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Enter the time-controlled component details
                </p>
              </div>
              <button
                onClick={() => setShowTCCModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto">
              {/* MSN Field */}
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  MSN (Manufacturer Serial Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 17263830"
                  value={tccFormData.msn}
                  onChange={(e) => setTccFormData({ ...tccFormData, msn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* TSN Field */}
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  TSN (Time Since New) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 4811.7"
                  value={tccFormData.tsn}
                  onChange={(e) => setTccFormData({ ...tccFormData, tsn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* CSN Field */}
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  CSN (Cycles Since New) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1549.2"
                  value={tccFormData.csn}
                  onChange={(e) => setTccFormData({ ...tccFormData, csn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowTCCModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle form submission here
                  console.log('TCC Form data:', tccFormData);
                  setShowTCCModal(false);
                  // Reset form
                  setTccFormData({
                    msn: '',
                    tsn: '',
                    csn: ''
                  });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
