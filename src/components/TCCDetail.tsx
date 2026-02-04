import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Search, Filter } from "lucide-react";
import { AddTCCModal } from "./AddTCCModal";

interface ComponentItem {
  id: number;
  remaining: string;
  date: string;
  when: string;
  aftt: string;
  partNo: string;
  serialNo: string;
  description: string;
  hours: string;
  threshold: string;
  methodOfCompliance: string;
  lastDoneDate: string;
  lastDoneYear: string;
  lastDoneAftt: string;
  nextDueDate: string;
  nextDueYear: string;
  nextDueAftt: string;
  reference: string;
}

export interface TCCDetailContentProps {
  aircraftId: string;
  showAddButton?: boolean;
}

/** TCC detail content (Aircraft info, POWERPLANT/AIRFRAME/PROPELLER tabs, component table). Use inside Maintenance TCC tab or in TCCDetail page. */
export function TCCDetailContent({
  aircraftId,
  showAddButton = true,
}: TCCDetailContentProps) {
  const [activeTab, setActiveTab] = useState<
    "POWERPLANT" | "AIRFRAME" | "PROPELLER"
  >("POWERPLANT");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleAddComponent = (component: any) => {
    console.log("New component added:", component);
  };

  // Sample data for Powerplant
  const powerplantData: ComponentItem[] = [
    {
      id: 1,
      remaining: "836",
      date: "0322",
      when: "2158",
      aftt: "",
      partNo: "IO-360-L2A",
      serialNo: "L-34520-48A",
      description: "Engine Overhaul",
      hours: "12",
      threshold: "2000",
      methodOfCompliance: "Overhaul",
      lastDoneDate: "5-Sep-23",
      lastDoneYear: "20323",
      lastDoneAftt: "678.0",
      nextDueDate: "5-Sep-25",
      nextDueYear: "2025",
      nextDueAftt: "2158.0",
      reference: "SID-10835",
    },
    {
      id: 2,
      remaining: "1.01",
      date: "0322",
      when: "2158",
      aftt: "",
      partNo: "",
      serialNo: "ADF00A01",
      description: "Engine Compartment Firewall Fuel Gaps: Hoe Testing",
      hours: "12",
      threshold: "2000",
      methodOfCompliance: "Replacement",
      lastDoneDate: "5-Sep-23",
      lastDoneYear: "20323",
      lastDoneAftt: "678.0",
      nextDueDate: "5-Sep-25",
      nextDueYear: "2025",
      nextDueAftt: "4765.0",
      reference: "ATL-18822",
    },
    {
      id: 3,
      remaining: "896",
      date: "1022",
      when: "2158",
      aftt: "",
      partNo: "",
      serialNo: "",
      description: "Engine Oil Contamination Inspect and Replace",
      hours: "12",
      threshold: "2000",
      methodOfCompliance: "Replacement",
      lastDoneDate: "5-Sep-23",
      lastDoneYear: "20323",
      lastDoneAftt: "678.0",
      nextDueDate: "5-Sep-25",
      nextDueYear: "2025",
      nextDueAftt: "4765.0",
      reference: "",
    },
    {
      id: 4,
      remaining: "1.01",
      date: "185",
      when: "1916.0",
      aftt: "07865",
      partNo: "",
      serialNo: "",
      description: "Air Filter",
      hours: "12",
      threshold: "2000",
      methodOfCompliance: "Replacement",
      lastDoneDate: "30-May-22",
      lastDoneYear: "20224",
      lastDoneAftt: "507.0",
      nextDueDate: "30-May-24",
      nextDueYear: "2024.4",
      nextDueAftt: "1916.0",
      reference: "",
    },
    {
      id: 5,
      remaining: "86",
      date: "466",
      when: "2158",
      aftt: "",
      partNo: "6438",
      serialNo: "6438",
      description: "Fuel Selector",
      hours: "16",
      threshold: "600",
      methodOfCompliance: "Overhaul",
      lastDoneDate: "5-Sep-23",
      lastDoneYear: "20234",
      lastDoneAftt: "678.0",
      nextDueDate: "5-Sep-27",
      nextDueYear: "2027.3",
      nextDueAftt: "1916.0",
      reference: "ATL-18232",
    },
    {
      id: 6,
      remaining: "1.01",
      date: "0",
      when: "1000.0",
      aftt: "07565",
      partNo: "07565",
      serialNo: "6738",
      description: "Vac Check Valve",
      hours: "10",
      threshold: "400",
      methodOfCompliance: "Replacement",
      lastDoneDate: "8-Aug-17",
      lastDoneYear: "2017.6",
      lastDoneAftt: "4,833.0",
      nextDueDate: "8-Aug-19",
      nextDueYear: "2019.6",
      nextDueAftt: "2400.0",
      reference: "ATL-16686",
    },
    {
      id: 7,
      remaining: "280",
      date: "1288",
      when: "2158",
      aftt: "",
      partNo: "",
      serialNo: "6-63576-5",
      description: "Vacuum Diaphragm Filter",
      hours: "400",
      threshold: "800",
      methodOfCompliance: "Replacement",
      lastDoneDate: "5-Sep-20",
      lastDoneYear: "2020.7",
      lastDoneAftt: "1550.0",
      nextDueDate: "5-Sep-23",
      nextDueYear: "2023.7",
      nextDueAftt: "2350.0",
      reference: "ATL-06240",
    },
    {
      id: 8,
      remaining: "2.25",
      date: "569",
      when: "1000.0",
      aftt: "64602",
      partNo: "64602",
      serialNo: "",
      description: "Hose and Lines, Nozzl and Pressure",
      hours: "12",
      threshold: "400",
      methodOfCompliance: "Replacement",
      lastDoneDate: "6-Aug-17",
      lastDoneYear: "7026.2",
      lastDoneAftt: "7026.2",
      nextDueDate: "6-Aug-19",
      nextDueYear: "7026.2",
      nextDueAftt: "7026.2",
      reference: "",
    },
  ];

  // Sample data for Airframe
  const airframeData: ComponentItem[] = [
    {
      id: 1,
      remaining: "3.99",
      date: "0",
      when: "0.0",
      aftt: "",
      partNo: "28780",
      serialNo: "",
      description: "Retractable Landing Gear (R. Part. MLG with Passenger)",
      hours: "01",
      threshold: "2000",
      methodOfCompliance: "Replacement",
      lastDoneDate: "31-May-04",
      lastDoneYear: "7387.7",
      lastDoneAftt: "",
      nextDueDate: "31-May-10",
      nextDueYear: "",
      nextDueAftt: "8927.7",
      reference: "ATL-17054",
    },
    {
      id: 2,
      remaining: "3.00",
      date: "0",
      when: "0.0",
      aftt: "",
      partNo: "25754",
      serialNo: "",
      description: "Landing Gear In - Bushing Kit",
      hours: "8",
      threshold: "",
      methodOfCompliance: "Replacement",
      lastDoneDate: "1-May-04",
      lastDoneYear: "",
      lastDoneAftt: "",
      nextDueDate: "",
      nextDueYear: "",
      nextDueAftt: "",
      reference: "",
    },
    {
      id: 3,
      remaining: "1.81",
      date: "848",
      when: "0.0",
      aftt: "",
      partNo: "B-00730-8-A",
      serialNo: "419048",
      description: "Aileron D - Landing Light Socket",
      hours: "",
      threshold: "",
      methodOfCompliance: "Replacement",
      lastDoneDate: "10-Aug-90",
      lastDoneYear: "10-Aug-94",
      lastDoneAftt: "",
      nextDueDate: "",
      nextDueYear: "",
      nextDueAftt: "",
      reference: "",
    },
    {
      id: 4,
      remaining: "2.94",
      date: "1248",
      when: "0.0",
      aftt: "",
      partNo: "10-00730-2",
      serialNo: "",
      description: "Stbd/board Landing Gear (Without skirt Light)",
      hours: "0",
      threshold: "",
      methodOfCompliance: "Servicing",
      lastDoneDate: "10-Feb-2020",
      lastDoneYear: "",
      lastDoneAftt: "",
      nextDueDate: "10-Feb-2021",
      nextDueYear: "",
      nextDueAftt: "",
      reference: "ATL-AT-55918",
    },
  ];

  // Sample data for Propeller
  const propellerData: ComponentItem[] = [
    {
      id: 1,
      remaining: "8.00",
      date: "995",
      when: "1994.0",
      aftt: "",
      partNo: "HC-C2YK-1BF",
      serialNo: "89A23354",
      description: "Propeller Hub Assy (Whhg) Inst",
      hours: "",
      threshold: "",
      methodOfCompliance: "Overhaul",
      lastDoneDate: "5-Sep-22",
      lastDoneYear: "",
      lastDoneAftt: "",
      nextDueDate: "",
      nextDueYear: "",
      nextDueAftt: "",
      reference: "ATL-C1803",
    },
    {
      id: 2,
      remaining: "1.04",
      date: "31",
      when: "1/4.0",
      aftt: "54.2",
      partNo: "",
      serialNo: "",
      description: "First Saying Featuring System Spark Wear(Multiple)",
      hours: "0",
      threshold: "",
      methodOfCompliance: "Inspection Test",
      lastDoneDate: "121-Feb-2019",
      lastDoneYear: "7028.3",
      lastDoneAftt: "7028.3",
      nextDueDate: "121-Feb-20",
      nextDueYear: "",
      nextDueAftt: "",
      reference: "ATL-C1403",
    },
    {
      id: 3,
      remaining: "1.48",
      date: "589",
      when: "1994.0",
      aftt: "54.2",
      partNo: "",
      serialNo: "",
      description: "Magneto Skive Oil, Drive and coupling Kit",
      hours: "3",
      threshold: "1000",
      methodOfCompliance: "Servicing",
      lastDoneDate: "8-Apr-2020",
      lastDoneYear: "7028.4",
      lastDoneAftt: "7028.4",
      nextDueDate: "8-Apr-2020",
      nextDueYear: "8588.2",
      nextDueAftt: "8588.2",
      reference: "ATL-C1403",
    },
    {
      id: 4,
      remaining: "2.10",
      date: "763",
      when: "1916.0",
      aftt: "54.2",
      partNo: "102-48",
      serialNo: "102.48",
      description: "Windshield L - Vent Water Cleaner",
      hours: "5",
      threshold: "1000",
      methodOfCompliance: "Servicing",
      lastDoneDate: "8-Apr-20",
      lastDoneYear: "7028.2",
      lastDoneAftt: "7028.2",
      nextDueDate: "8-Apr-20",
      nextDueYear: "8788.2",
      nextDueAftt: "8788.2",
      reference: "ATL-C1403",
    },
    {
      id: 5,
      remaining: "2.94",
      date: "994",
      when: "1916.0",
      aftt: "54.2",
      partNo: "164-8",
      serialNo: "164-8",
      description: "Pilot-arm Kit Variable Damper",
      hours: "5",
      threshold: "1000",
      methodOfCompliance: "Servicing",
      lastDoneDate: "8-Apr-2020",
      lastDoneYear: "7028.6",
      lastDoneAftt: "7028.6",
      nextDueDate: "8-Apr-2020",
      nextDueYear: "8788.6",
      nextDueAftt: "8788.6",
      reference: "ATL-C1403",
    },
    {
      id: 6,
      remaining: "2.10",
      date: "886",
      when: "1640.0",
      aftt: "54.03",
      partNo: "164-8",
      serialNo: "3-88.02",
      description: "Cabin Window (HMS)",
      hours: "8",
      threshold: "",
      methodOfCompliance: "Servicing",
      lastDoneDate: "8-Apr-2020",
      lastDoneYear: "7028.2",
      lastDoneAftt: "7028.2",
      nextDueDate: "8-Apr-2025",
      nextDueYear: "8788.2",
      nextDueAftt: "8788.2",
      reference: "ATL-C1403",
    },
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case "POWERPLANT":
        return powerplantData;
      case "AIRFRAME":
        return airframeData;
      case "PROPELLER":
        return propellerData;
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter(
      (item) =>
        (item.reference || "").toLowerCase().includes(q) ||
        (item.partNo || "").toLowerCase().includes(q) ||
        (item.serialNo || "").toLowerCase().includes(q)
    );
  };

  const filteredData = getFilteredData();
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // TCC pattern color: blue (same as CPCP Monitoring pattern)
  const tccHeaderColor = "bg-blue-600";

  const categoryOptions: {
    value: "POWERPLANT" | "AIRFRAME" | "PROPELLER";
    label: string;
    count: number;
  }[] = [
    { value: "POWERPLANT", label: "Powerplant", count: powerplantData.length },
    { value: "AIRFRAME", label: "Airframe", count: airframeData.length },
    { value: "PROPELLER", label: "Propeller", count: propellerData.length },
  ];

  return (
    <>
      {/* Title + Aircraft - same pattern as CPCP Monitoring */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-900 tracking-tight">TCC Monitoring</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-gray-600">
            <span className="font-medium text-gray-900">MSN</span>
            <span>{aircraftId}</span>
            <span>TSN <span className="text-gray-900">7561</span></span>
            <span>CSN <span className="text-gray-900">11656.0</span></span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search Component
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ATL-No, part no, or serial no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="w-56">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Filter by Category
          </label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <select
              value={activeTab}
              onChange={(e) =>
                setActiveTab(
                  e.target.value as "POWERPLANT" | "AIRFRAME" | "PROPELLER"
                )
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.count})
                </option>
              ))}
            </select>
          </div>
        </div>
        {showAddButton && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap mt-6"
          >
            <Plus className="w-4 h-4" />
            Add TCC Entry
          </button>
        )}
      </div>
      {/* Tabs */}
      {/* <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("POWERPLANT")}
          className={`px-6 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "POWERPLANT"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          POWERPLANT
        </button>
        <button
          onClick={() => setActiveTab("AIRFRAME")}
          className={`px-6 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "AIRFRAME"
              ? "bg-orange-600 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          AIRFRAME
        </button>
        <button
          onClick={() => setActiveTab("PROPELLER")}
          className={`px-6 py-2 rounded-lg text-sm transition-colors ${
            activeTab === "PROPELLER"
              ? "bg-teal-600 text-white"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          PROPELLER
        </button>
      </div> */}

      {/* Table card - TCC pattern, blue */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div
          className={`${tccHeaderColor} text-white px-5 py-3.5 text-sm font-medium flex items-center gap-3`}
        >
          <span>{categoryOptions.find((o) => o.value === activeTab)?.label ?? activeTab}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  colSpan={4}
                  className="px-3 py-2 text-xs text-gray-600"
                ></th>
                <th
                  colSpan={2}
                  className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                >
                  PART INFO
                </th>
                <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"></th>
                <th
                  colSpan={2}
                  className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                >
                  COMPONENT LIMIT
                </th>
                <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"></th>
                <th
                  colSpan={3}
                  className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                >
                  LAST DONE
                </th>
                <th
                  colSpan={3}
                  className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"
                >
                  NEXT DUE
                </th>
                <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"></th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  YEARS
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  DAYS
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  TACH
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  AFTT
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  PART NO.
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  SERIAL NO.
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  DESCRIPTION
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  YEARS
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  HOURS
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  METHOD OF COMPLIANCE
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  DATE
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  TACH
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  AFTT
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  DATE
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  TACH
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">
                  AFTT
                </th>
                <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  ATL-SEC.NO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.remaining}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.date}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.when}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.aftt}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.partNo}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.serialNo}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.description}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.hours}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.threshold}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.methodOfCompliance}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.lastDoneDate}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.lastDoneYear}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.lastDoneAftt}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.nextDueDate}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.nextDueYear}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs">
                    {item.nextDueAftt}
                  </td>
                  <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">
                    {item.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination - CPCP Monitoring pattern */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm appearance-none bg-no-repeat bg-[length:12px] bg-[right_0.25rem_center] pr-6"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
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
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 px-6 py-2">
          Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, totalItems)} of{" "}
          {totalItems} components
        </div>
      </div>

      {/* Add TCC Entry Modal */}
      <AddTCCModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddComponent}
      />
    </>
  );
}

export function TCCDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = id ?? "";

  const handleBack = () => {
    navigate(`/profile/${id}/maintenance-ldnd`);
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
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
              <h1 className="text-gray-900">TCC Monitoring</h1>
              <p className="text-gray-600 text-sm mt-1">
                Time Controlled Components – life limit and replacement
                schedules
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <TCCDetailContent aircraftId={aircraftId} showAddButton={true} />
      </div>
    </div>
  );
}
