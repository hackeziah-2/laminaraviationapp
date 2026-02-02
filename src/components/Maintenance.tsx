import {
  ArrowLeft,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Search,
  Download,
  Printer,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ADWorkOrders } from "./ADWorkOrders";
import { CPCPMonitoring } from "./CPCPMonitoring";
import {
  getAircraftLdndMonitoring,
  getAircraftLdndMonitoringLatest,
  createAircraftLdndMonitoring,
  updateAircraftLdndMonitoring,
  deleteAircraftLdndMonitoring,
  type LDNDMonitoring,
} from "../api/ldndMonitoringApi";
import { Spinner } from "./ui/spinner";
import Swal from "sweetalert2";

interface ADItem {
  id: number;
  adNumber: string;
  subject: string;
  status: "Active" | "Compliant" | "Superseded";
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
  status: "Current" | "Due Soon" | "Critical";
}

interface CPCPItem {
  id: number;
  msn: string;
  aftf: string;
  totalInspections: number;
  nextDue: string;
  status: "Current" | "Due Soon" | "Overdue";
}

type MaintenanceCategory = "LDND" | "AD" | "TCC" | "CPCP";

export function Maintenance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = parseInt(id || "1");

  const handleBack = () => {
    navigate("/profile");
  };

  const handleViewTCC = (msn: number) => {
    navigate(`/profile/${id}/maintenance/tcc/${msn}`);
  };

  const handleViewCPCP = (msn: string) => {
    navigate(`/profile/${id}/maintenance/cpcp/${msn}`);
  };

  const handleViewADWorkOrders = (adNumber: string) => {
    navigate(`/profile/${id}/maintenance/ad-work-orders/${adNumber}`);
  };

  const [activeCategory, setActiveCategory] =
    useState<MaintenanceCategory>("LDND");
  const [searchQuery, setSearchQuery] = useState("");
  const [ldndSearchQuery, setLdndSearchQuery] = useState("");
  const [adSearchQuery, setAdSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showADModal, setShowADModal] = useState(false);
  const [showTCCModal, setShowTCCModal] = useState(false);
  const [selectedAD, setSelectedAD] = useState<string | null>(null);
  const [showCPCPMonitoring, setShowCPCPMonitoring] = useState(false);
  const [selectedCPCPMsn, setSelectedCPCPMsn] = useState<string>("");
  const [tccFormData, setTccFormData] = useState({
    msn: "",
    tsn: "",
    csn: "",
  });

  // Pagination state for LDND
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Pagination state for AD
  const [adCurrentPage, setAdCurrentPage] = useState(1);
  const [adItemsPerPage, setAdItemsPerPage] = useState(10);

  // Add Entry form state for LDND
  const [newEntry, setNewEntry] = useState({
    inspectionType: "",
    unit: "HRS",
    tachDue: "",
    tachDone: "",
    start: "",
    end: "",
    nextDue: "",
  });

  // LDND API state
  const [ldndItems, setLdndItems] = useState<LDNDMonitoring[]>([]);
  const [ldndLoading, setLdndLoading] = useState(false);
  const [ldndError, setLdndError] = useState<string | null>(null);
  const [ldndTotal, setLdndTotal] = useState(0);
  const [ldndPages, setLdndPages] = useState(0);
  const [editingLdndEntry, setEditingLdndEntry] =
    useState<LDNDMonitoring | null>(null);
  const [ldndSaving, setLdndSaving] = useState(false);
  const [ldndLatest, setLdndLatest] = useState<{
    currentTachDisplay: string;
    nextInspection: string;
    lastUpdated: string;
  } | null>(null);

  // Add Entry form state for AD
  const [newADEntry, setNewADEntry] = useState({
    adNumber: "",
    subject: "",
    inspectionInterval: "",
    complianceRequired: "",
  });

  // Fetch LDND Monitoring from API (api/v1/aircraft/{aircraft_id}/ldnd-monitoring/)
  const fetchLdnd = useCallback(async () => {
    if (!aircraftId || activeCategory !== "LDND") return;
    setLdndLoading(true);
    setLdndError(null);
    try {
      const res = await getAircraftLdndMonitoring(
        aircraftId,
        currentPage,
        itemsPerPage,
        ldndSearchQuery
      );
      setLdndItems(res.items);
      setLdndTotal(res.total);
      setLdndPages(res.pages);
    } catch (err: any) {
      console.error("LDND fetch error:", err);
      setLdndError(
        err?.response?.data?.detail ??
          err?.message ??
          "Failed to load LDND records"
      );
      setLdndItems([]);
    } finally {
      setLdndLoading(false);
    }
  }, [aircraftId, activeCategory, currentPage, itemsPerPage, ldndSearchQuery]);

  const fetchLdndLatest = useCallback(async () => {
    if (!aircraftId || activeCategory !== "LDND") return;
    try {
      const latest = await getAircraftLdndMonitoringLatest(aircraftId);
      setLdndLatest({
        currentTachDisplay: latest.currentTachDisplay,
        nextInspection: latest.nextInspection,
        lastUpdated: latest.lastUpdated,
      });
    } catch {
      setLdndLatest(null);
    }
  }, [aircraftId, activeCategory]);

  useEffect(() => {
    if (activeCategory === "LDND") {
      fetchLdnd();
      fetchLdndLatest();
    }
  }, [activeCategory, fetchLdnd, fetchLdndLatest]);

  useEffect(() => {
    setCurrentPage(1);
  }, [ldndSearchQuery]);

  const totalPages = ldndPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, ldndTotal);
  const paginatedLDNDItems = ldndItems;

  const handleLdndCreateOrUpdate = async () => {
    const inspectionType = String(newEntry.inspectionType).trim();
    const tachDue = Number(newEntry.tachDue);
    const tachDone = Number(newEntry.tachDone);
    const nextDue = Number(newEntry.nextDue);
    if (!inspectionType || isNaN(tachDone) || isNaN(nextDue)) {
      await Swal.fire({
        icon: "warning",
        title: "Required fields",
        text: "Please fill Inspection Type, Tach Done, and Next Due.",
      });
      return;
    }
    setLdndSaving(true);

    try {
      if (editingLdndEntry) {
        await updateAircraftLdndMonitoring(aircraftId, editingLdndEntry.id, {
          inspectionType,
          unit: newEntry.unit,
          tachDue: isNaN(tachDue) ? undefined : tachDue,
          tachDone,
          start: newEntry.start || undefined,
          end: newEntry.end || undefined,
          nextDue,
        });
      } else {
        await createAircraftLdndMonitoring(aircraftId, {
          inspectionType,
          unit: newEntry.unit,
          tachDue: isNaN(tachDue) ? 0 : tachDue,
          tachDone,
          start: newEntry.start || "",
          end: newEntry.end || "",
          nextDue,
        });
      }
      setShowAddModal(false);
      setEditingLdndEntry(null);
      setNewEntry({
        inspectionType: "",
        unit: "HRS",
        tachDue: "",
        tachDone: "",
        start: "",
        end: "",
        nextDue: "",
      });
      fetchLdnd();
      fetchLdndLatest();
      await Swal.fire({
        icon: "success",
        title: editingLdndEntry ? "Updated!" : "Saved!",
        text: editingLdndEntry
          ? "The LDND entry has been updated."
          : "The LDND entry has been saved.",
      });
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.detail ?? err?.message ?? "Failed to save entry.",
      });
    } finally {
      setLdndSaving(false);
    }
  };

  const handleLdndDelete = async (item: LDNDMonitoring) => {
    const result = await Swal.fire({
      title: "Delete LDND entry?",
      text: `"${item.inspectionType}" (Tach Done ${item.tachDone}) — you won't be able to revert this.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteAircraftLdndMonitoring(aircraftId, item.id);
      fetchLdnd();
      fetchLdndLatest();
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The LDND entry has been deleted.",
      });
    } catch (err: any) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err?.response?.data?.detail ?? err?.message ?? "Failed to delete entry.",
      });
    }
  };

  const toDateInputValue = (dateStr: string): string => {
    if (!dateStr || !dateStr.trim()) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const openEditLdnd = (item: LDNDMonitoring) => {
    setEditingLdndEntry(item);
    setNewEntry({
      inspectionType: item.inspectionType,
      unit: item.unit,
      tachDue: String(item.tachDue),
      tachDone: String(item.tachDone),
      start: toDateInputValue(item.start),
      end: toDateInputValue(item.end),
      nextDue: String(item.nextDue),
    });
    setShowAddModal(true);
  };

  // AD Forecasting Data
  const adItems: ADItem[] = [
    {
      id: 1,
      adNumber: "2021-16-09",
      subject: "Seat Rails and Roller Housing Inspection",
      status: "Active",
      inspectionInterval: "Every 100 hours or Annual, WEP",
      complianceRequired: "Before further flight",
      workOrders: 3,
      dateViewed: "2024-01-15",
    },
    {
      id: 2,
      adNumber: "2016-26-16",
      subject: "Wing Spar Inspection",
      status: "Active",
      inspectionInterval: "Every 250 hours or Annual",
      complianceRequired: "Within 60 flight hours",
      workOrders: 2,
      dateViewed: "2024-01-10",
    },
    {
      id: 3,
      adNumber: "2016-03-22",
      subject: "Elevator Jack Screw Inspection",
      status: "Compliant",
      inspectionInterval: "Every one-time inspection",
      complianceRequired: "Within 25 flight hours",
      workOrders: 1,
      dateViewed: "2024-01-08",
    },
    {
      id: 4,
      adNumber: "2016-08-11",
      subject: "Elevator Control Cable Inspection",
      status: "Active",
      inspectionInterval: "Every 50 hours or Annual",
      complianceRequired: "Before further flight",
      workOrders: 4,
      dateViewed: "2024-01-12",
    },
    {
      id: 5,
      adNumber: "2018-21-18",
      subject: "Fuel Tank Cap Seal Replacement",
      status: "Active",
      inspectionInterval: "Every 500 hours or 5 years",
      complianceRequired: "Within 100 flight hours",
      workOrders: 2,
      dateViewed: "2024-01-05",
    },
    {
      id: 6,
      adNumber: "2015-11-05",
      subject: "Landing Gear Actuator Inspection",
      status: "Active",
      inspectionInterval: "Every 1000 hours",
      complianceRequired: "Before further flight",
      workOrders: 5,
      dateViewed: "2024-01-14",
    },
    {
      id: 7,
      adNumber: "2016-07-25",
      subject: "Battery Terminal Corrosion Inspection",
      status: "Active",
      inspectionInterval: "Every 100 hours or Annual",
      complianceRequired: "Within 60 flight hours",
      workOrders: 1,
      dateViewed: "2024-01-09",
    },
    {
      id: 8,
      adNumber: "2021-04-12",
      subject: "Engine Oil Cooler Inspection",
      status: "Superseded",
      inspectionInterval: "Every 500 hours",
      complianceRequired: "Before further flight",
      workOrders: 3,
      dateViewed: "2024-01-11",
    },
    {
      id: 9,
      adNumber: "2022-09-30",
      subject: "Aileron Hinge Inspection",
      status: "Active",
      inspectionInterval: "Every 100 hours or Annual",
      complianceRequired: "Before further flight",
      workOrders: 2,
      dateViewed: "2024-01-13",
    },
    {
      id: 10,
      adNumber: "2023-07-18",
      subject: "Rudder Cable Inspection",
      status: "Active",
      inspectionInterval: "Every 100 hours or Annual",
      complianceRequired: "Within 50 flight hours",
      workOrders: 1,
      dateViewed: "2024-01-07",
    },
    {
      id: 11,
      adNumber: "2020-15-22",
      subject: "Propeller Hub Inspection",
      status: "Active",
      inspectionInterval: "Every 200 hours or Annual",
      complianceRequired: "Before further flight",
      workOrders: 4,
      dateViewed: "2024-01-06",
    },
    {
      id: 12,
      adNumber: "2019-12-08",
      subject: "Vacuum Pump Inspection",
      status: "Compliant",
      inspectionInterval: "Every 500 hours",
      complianceRequired: "Within 100 flight hours",
      workOrders: 2,
      dateViewed: "2024-01-04",
    },
    {
      id: 13,
      adNumber: "2017-08-19",
      subject: "Alternator Belt Inspection",
      status: "Active",
      inspectionInterval: "Every 100 hours or Annual",
      complianceRequired: "Before further flight",
      workOrders: 1,
      dateViewed: "2024-01-03",
    },
    {
      id: 14,
      adNumber: "2020-11-27",
      subject: "Fuel Line Hose Replacement",
      status: "Active",
      inspectionInterval: "Every 1000 hours",
      complianceRequired: "Within 150 flight hours",
      workOrders: 3,
      dateViewed: "2024-01-02",
    },
    {
      id: 15,
      adNumber: "2018-06-14",
      subject: "Ignition Harness Inspection",
      status: "Active",
      inspectionInterval: "Every 500 hours",
      complianceRequired: "Before further flight",
      workOrders: 2,
      dateViewed: "2024-01-01",
    },
  ];

  // Pagination calculations for AD with search
  const filteredADItems = useMemo(() => {
    if (!adSearchQuery.trim()) return adItems;
    const query = adSearchQuery.toLowerCase();
    return adItems.filter(
      (item) =>
        item.adNumber.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.inspectionInterval.toLowerCase().includes(query) ||
        item.complianceRequired.toLowerCase().includes(query)
    );
  }, [adItems, adSearchQuery]);

  const adTotalPages = Math.ceil(filteredADItems.length / adItemsPerPage);
  const adStartIndex = (adCurrentPage - 1) * adItemsPerPage;
  const adEndIndex = adStartIndex + adItemsPerPage;
  const paginatedADItems = filteredADItems.slice(adStartIndex, adEndIndex);

  // TCC Forecasting Data
  const tccItems: TCCItem[] = [
    {
      id: 1,
      msn: 17263830,
      tsn: 4811.7,
      csn: 1549.2,
      components: 12,
      status: "Current",
    },
    {
      id: 2,
      msn: 17263831,
      tsn: 5100.5,
      csn: 1623.8,
      components: 8,
      status: "Current",
    },
    {
      id: 3,
      msn: 17263832,
      tsn: 6580.0,
      csn: 2145.3,
      components: 15,
      status: "Current",
    },
    {
      id: 4,
      msn: 17263833,
      tsn: 3250.5,
      csn: 1025.7,
      components: 6,
      status: "Due Soon",
    },
    {
      id: 5,
      msn: 17263834,
      tsn: 1890.3,
      csn: 742.1,
      components: 4,
      status: "Critical",
    },
    {
      id: 6,
      msn: 17263835,
      tsn: 7245.8,
      csn: 2387.9,
      components: 18,
      status: "Current",
    },
  ];

  // CPCP Forecasting Data
  const cpcpItems: CPCPItem[] = [
    {
      id: 1,
      msn: "17XXXX4",
      aftf: "7984 H",
      totalInspections: 10,
      nextDue: "15-Dec-25",
      status: "Current",
    },
    {
      id: 2,
      msn: "11-03156-26A",
      aftf: "7830 H",
      totalInspections: 12,
      nextDue: "20-Nov-25",
      status: "Due Soon",
    },
    {
      id: 3,
      msn: "11-03210-30B",
      aftf: "6543 H",
      totalInspections: 8,
      nextDue: "05-Oct-25",
      status: "Overdue",
    },
    {
      id: 4,
      msn: "11-04567-42C",
      aftf: "5234 H",
      totalInspections: 15,
      nextDue: "18-Jan-26",
      status: "Current",
    },
    {
      id: 5,
      msn: "11-05678-55D",
      aftf: "8932 H",
      totalInspections: 14,
      nextDue: "22-Jan-26",
      status: "Current",
    },
  ];

  // Filter logic
  const getFilteredItems = () => {
    let items: any[] = [];

    switch (activeCategory) {
      case "LDND":
        items = ldndItems;
        break;
      case "AD":
        items = adItems;
        break;
      case "TCC":
        items = tccItems;
        break;
      case "CPCP":
        items = cpcpItems;
        break;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => {
        const searchableText = Object.values(item).join(" ").toLowerCase();
        return searchableText.includes(query);
      });
    }

    return items;
  };

  const filteredItems = getFilteredItems();

  // Status color functions
  const getLDNDStatusColor = (status: string) => {
    switch (status) {
      case "Overdue":
        return "bg-red-100 text-red-800 border border-red-300";
      case "Due Soon":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "Current":
        return "bg-green-100 text-green-800 border border-green-300";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getADStatusColor = (status: string) => {
    switch (status) {
      case "Overdue":
        return "bg-red-100 text-red-800 border border-red-300";
      case "Due Soon":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "Compliant":
        return "bg-green-100 text-green-800 border border-green-300";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getTCCStatusColor = (status: string) => {
    switch (status) {
      case "Critical":
        return "bg-red-100 text-red-800 border border-red-300";
      case "Due Soon":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "Current":
        return "bg-green-100 text-green-800 border border-green-300";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  const getCPCPStatusColor = (status: string) => {
    switch (status) {
      case "Overdue":
        return "bg-red-100 text-red-800 border border-red-300";
      case "Due Soon":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "Current":
        return "bg-green-100 text-green-800 border border-green-300";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  // Get counts for each category
  const getCounts = () => {
    switch (activeCategory) {
      case "LDND":
        return {
          critical: 0,
          warning: 0,
          good: ldndTotal,
        };
      case "AD":
        return {
          critical: adItems.filter((i) => i.status === "Overdue").length,
          warning: adItems.filter((i) => i.status === "Due Soon").length,
          good: adItems.filter((i) => i.status === "Compliant").length,
        };
      case "TCC":
        return {
          critical: tccItems.filter((i) => i.status === "Critical").length,
          warning: tccItems.filter((i) => i.status === "Due Soon").length,
          good: tccItems.filter((i) => i.status === "Current").length,
        };
      case "CPCP":
        return {
          critical: cpcpItems.filter((i) => i.status === "Overdue").length,
          warning: cpcpItems.filter((i) => i.status === "Due Soon").length,
          good: cpcpItems.filter((i) => i.status === "Current").length,
        };
    }
  };

  const counts = getCounts();

  const categories = [
    {
      key: "LDND" as MaintenanceCategory,
      label: "LDND",
      fullName: "Last Done Next Due",
    },
    {
      key: "AD" as MaintenanceCategory,
      label: "AD Forecasting",
      fullName: "Airworthiness Directives",
    },
    {
      key: "TCC" as MaintenanceCategory,
      label: "TCC Forecasting",
      fullName: "Time Controlled Components",
    },
    {
      key: "CPCP" as MaintenanceCategory,
      label: "CPCP Forecasting",
      fullName: "Corrosion Prevention & Control Program",
    },
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
            <h2 className="text-gray-900 text-lg sm:text-xl">
              Maintenance Forecasting
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Aircraft ID: {aircraftId}
            </p>
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
              onClick={() => {
                setActiveCategory(category.key);
                setLdndSearchQuery(""); // Reset LDND search when switching tabs
                setAdSearchQuery(""); // Reset AD search when switching tabs
                setCurrentPage(1); // Reset to first page
                setAdCurrentPage(1); // Reset AD to first page
              }}
              className={`flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm transition-colors relative whitespace-nowrap ${
                activeCategory === category.key
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>{category.label}</span>
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {category.fullName}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Summary Cards - hide for LDND and AD */}
        {activeCategory !== "LDND" && activeCategory !== "AD" && (
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-xs mb-1">
                      {activeCategory === "CPCP"
                        ? "Overdue"
                        : activeCategory === "TCC"
                        ? "Critical"
                        : "Overdue"}
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
        {activeCategory === "LDND" && (
          <>
            {/* Info Cards (from api/v1/aircraft/{aircraft_id}/ldnd-monitoring/latest) */}
            <div className="p-5 border-b border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">Current Tach</div>
                  <div className="text-gray-900 text-lg">
                    {ldndLatest?.currentTachDisplay ?? "-"}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    Next Inspection
                  </div>
                  <div className="text-gray-900 text-lg">
                    {ldndLatest?.nextInspection ?? "-"}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                  <div className="text-gray-900 text-lg">
                    {ldndLatest?.lastUpdated ?? "-"}
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
                  onClick={() => {
                    setEditingLdndEntry(null);
                    setNewEntry({
                      inspectionType: "",
                      unit: "HRS",
                      tachDue: "",
                      tachDone: "",
                      start: "",
                      end: "",
                      nextDue: "",
                    });
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </div>
            </div>

            {/* Inspection History Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-gray-900 text-sm">
                Inspection History (LDND Monitoring)
              </div>
              <div className="text-gray-500 text-xs">
                Showing {ldndTotal > 0 ? startIndex + 1 : 0} to {endIndex} of{" "}
                {ldndTotal} records | Items per page: {itemsPerPage}
              </div>
            </div>

            {/* LDND Table */}
            {ldndError && (
              <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100 flex items-center justify-between gap-2">
                <span>{ldndError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setLdndError(null);
                    fetchLdnd();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              {ldndLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    {/* Red Header with LAST DONE and column groups */}
                    <tr style={{ backgroundColor: "#EF4444" }}>
                      <th
                        colSpan={1}
                        className="px-3 py-2 text-left text-white text-xs"
                      >
                        INSPECTION TYPE
                      </th>
                      <th
                        colSpan={3}
                        className="px-3 py-2 text-center text-white text-xs border-l border-white/30"
                      >
                        LAST DONE
                      </th>
                      <th
                        colSpan={2}
                        className="px-3 py-2 text-center text-white text-xs border-l border-white/30"
                      >
                        DATE PERFORMED
                      </th>
                      <th
                        colSpan={2}
                        className="px-3 py-2 text-center text-white text-xs border-l border-white/30"
                      >
                        NEXT DUE / ACTIONS
                      </th>
                    </tr>
                    {/* Light green header with specific columns */}
                    <tr style={{ backgroundColor: "#D1F4E0" }}>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs">
                        TYPE
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        UNIT
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        TACH DUE
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        TACH DONE
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        START
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        END
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        NEXT DUE
                      </th>
                      <th className="px-3 py-2 text-left text-gray-900 text-xs border-l border-gray-300">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLDNDItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-8 text-center text-gray-500 text-sm"
                        >
                          {ldndSearchQuery
                            ? `No records found matching "${ldndSearchQuery}".`
                            : "No LDND records. Add an entry to get started."}
                        </td>
                      </tr>
                    ) : (
                      paginatedLDNDItems.map((item) => (
                        <tr
                          key={item.id}
                          style={{ backgroundColor: "#E8F5E9" }}
                          className="border-b border-gray-200"
                        >
                          <td className="px-3 py-2 text-gray-900 text-sm">
                            {item.inspectionType}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            {item.unit}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            {item.tachDue}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            {item.tachDone}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            {item.start}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            {item.end}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            {item.nextDue}
                          </td>
                          <td className="px-3 py-2 text-gray-900 text-sm border-l border-gray-300">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditLdnd(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLdndDelete(item)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
            <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || ldndLoading}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from(
                { length: Math.max(1, totalPages) },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={ldndLoading}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={
                  currentPage === totalPages || ldndLoading || totalPages === 0
                }
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Search for TCC with Add Entry button */}
        {activeCategory === "TCC" && (
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
        {activeCategory === "CPCP" && (
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
        {activeCategory === "AD" && (
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
                  onClick={() => setShowADModal(true)}
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
                Showing {filteredADItems.length > 0 ? adStartIndex + 1 : 0} to{" "}
                {Math.min(adEndIndex, filteredADItems.length)} of{" "}
                {filteredADItems.length} records
              </div>
            </div>

            {/* AD Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      AD Number
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      Inspection Interval
                    </th>
                    <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                      Compliance Required
                    </th>
                    <th className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider">
                      Work Orders
                    </th>
                    <th className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedADItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-gray-500 text-sm"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedADItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-4 text-gray-900 text-sm">
                          {item.adNumber}
                        </td>
                        <td className="px-5 py-4 text-gray-900 text-sm">
                          {item.subject}
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-sm">
                          {item.inspectionInterval}
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-sm">
                          {item.complianceRequired}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{item.workOrders}</span>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() =>
                              handleViewADWorkOrders(item.adNumber)
                            }
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm transition-colors"
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

            {/* Pagination Controls */}
            {filteredADItems.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() =>
                    setAdCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={adCurrentPage === 1}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: adTotalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setAdCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded ${
                          adCurrentPage === page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() =>
                    setAdCurrentPage((prev) => Math.min(adTotalPages, prev + 1))
                  }
                  disabled={adCurrentPage === adTotalPages}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* TCC Forecasting Table */}
        {activeCategory === "TCC" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    MSN
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    TSN
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    CSN
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    Components
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-gray-500 text-sm"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  (filteredItems as TCCItem[]).map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.msn}
                      </td>
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.tsn}
                      </td>
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.csn}
                      </td>
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.components}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded text-xs ${getTCCStatusColor(
                            item.status
                          )}`}
                        >
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
        {activeCategory === "CPCP" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    MSN
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    AFTF
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    Total Inspections
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    Next Due
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-gray-500 text-sm"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  (filteredItems as CPCPItem[]).map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.msn}
                      </td>
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.aftf}
                      </td>
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.totalInspections}
                      </td>
                      <td className="px-5 py-4 text-gray-900 text-sm">
                        {item.nextDue}
                      </td>
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

      {/* Add/Edit Entry Modal for LDND with Frosted Glass Overlay */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={() => {
            setShowAddModal(false);
            setEditingLdndEntry(null);
            setNewEntry({
              inspectionType: "",
              unit: "HRS",
              tachDue: "",
              tachDone: "",
              start: "",
              end: "",
              nextDue: "",
            });
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900">
                {editingLdndEntry ? "Edit LDND Entry" : "Add New Entry"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLdndEntry(null);
                  setNewEntry({
                    inspectionType: "",
                    unit: "HRS",
                    tachDue: "",
                    tachDone: "",
                    start: "",
                    end: "",
                    nextDue: "",
                  });
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
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
                    <label className="block text-gray-600 text-xs mb-1.5">
                      Type
                    </label>
                    <input
                      type="text"
                      value={newEntry.inspectionType}
                      onChange={(e) =>
                        setNewEntry({
                          ...newEntry,
                          inspectionType: e.target.value,
                        })
                      }
                      placeholder="e.g., 5H"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 2: LAST DONE */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Last Done
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">
                        Unit
                      </label>
                      <select
                        value={newEntry.unit}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, unit: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: "right 0.5rem center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "1.5em 1.5em",
                          paddingRight: "2.5rem",
                        }}
                      >
                        <option value="HRS">HRS</option>
                        <option value="CYCLES">CYCLES</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">
                        Tach Due
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.tachDue}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, tachDue: e.target.value })
                        }
                        placeholder="0.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">
                        Tach Done
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newEntry.tachDone}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, tachDone: e.target.value })
                        }
                        placeholder="0.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 3: DATE PERFORMED */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Date Performed
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">
                        Start
                      </label>
                      <input
                        type="date"
                        value={newEntry.start}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, start: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1.5">
                        End
                      </label>
                      <input
                        type="date"
                        value={newEntry.end}
                        onChange={(e) =>
                          setNewEntry({ ...newEntry, end: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 4: NEXT DUE */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Next Due
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">
                      Tach Hours
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newEntry.nextDue}
                      onChange={(e) =>
                        setNewEntry({ ...newEntry, nextDue: e.target.value })
                      }
                      placeholder="0.0"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLdndEntry(null);
                  setNewEntry({
                    inspectionType: "",
                    unit: "HRS",
                    tachDue: "",
                    tachDone: "",
                    start: "",
                    end: "",
                    nextDue: "",
                  });
                }}
                disabled={ldndSaving}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors text-gray-700 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLdndCreateOrUpdate}
                disabled={ldndSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {ldndSaving
                  ? "Saving..."
                  : editingLdndEntry
                  ? "Update Entry"
                  : "Add Entry"}
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
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onClick={() => setShowADModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-900">Add New Airworthiness Directive</h3>
              <button
                onClick={() => setShowADModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
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
                    <label className="block text-gray-600 text-xs mb-1.5">
                      AD Number
                    </label>
                    <input
                      type="text"
                      value={newADEntry.adNumber}
                      onChange={(e) =>
                        setNewADEntry({
                          ...newADEntry,
                          adNumber: e.target.value,
                        })
                      }
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
                    <label className="block text-gray-600 text-xs mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={newADEntry.subject}
                      onChange={(e) =>
                        setNewADEntry({
                          ...newADEntry,
                          subject: e.target.value,
                        })
                      }
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
                    <label className="block text-gray-600 text-xs mb-1.5">
                      Interval
                    </label>
                    <input
                      type="text"
                      value={newADEntry.inspectionInterval}
                      onChange={(e) =>
                        setNewADEntry({
                          ...newADEntry,
                          inspectionInterval: e.target.value,
                        })
                      }
                      placeholder="e.g., 500 FH"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Column 4: COMPLIANCE REQUIRED */}
                <div className="space-y-4">
                  <div className="text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                    Compliance Required
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1.5">
                      Date
                    </label>
                    <input
                      type="text"
                      value={newADEntry.complianceRequired}
                      onChange={(e) =>
                        setNewADEntry({
                          ...newADEntry,
                          complianceRequired: e.target.value,
                        })
                      }
                      placeholder="e.g., 15-Dec-2024"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowADModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Add entry logic here
                  console.log("New AD entry:", newADEntry);
                  setShowADModal(false);
                  // Reset form
                  setNewADEntry({
                    adNumber: "",
                    subject: "",
                    inspectionInterval: "",
                    complianceRequired: "",
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

      {/* Add Entry Modal for TCC with Frosted Glass Overlay */}
      {showTCCModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
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
                  MSN (Manufacturer Serial Number){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 17263830"
                  value={tccFormData.msn}
                  onChange={(e) =>
                    setTccFormData({ ...tccFormData, msn: e.target.value })
                  }
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
                  onChange={(e) =>
                    setTccFormData({ ...tccFormData, tsn: e.target.value })
                  }
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
                  onChange={(e) =>
                    setTccFormData({ ...tccFormData, csn: e.target.value })
                  }
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
                  console.log("TCC Form data:", tccFormData);
                  setShowTCCModal(false);
                  // Reset form
                  setTccFormData({
                    msn: "",
                    tsn: "",
                    csn: "",
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
