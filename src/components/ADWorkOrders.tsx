import { ArrowLeft, Printer, Download, Plus, X, Calendar } from "lucide-react";
import { useState } from "react";

interface ADWorkOrdersProps {
  adNumber: string;
  onBack: () => void;
}

interface WorkOrder {
  id: number;
  woNumber: string;
  lastDoneAcft: string;
  lastDoneTach: string;
  lastDoneDate: string;
  nextDueAcft: string;
  nextDueTach: string;
  atlReference: string;
}

export function ADWorkOrders({ adNumber, onBack }: ADWorkOrdersProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    woNumber: "",
    lastDoneAcft: "",
    lastDoneTach: "",
    lastDoneDate: "",
    nextDueAcft: "",
    nextDueTach: "",
    atlReference: "",
  });

  // Mock data for work orders
  const workOrders: WorkOrder[] = [
    {
      id: 1,
      woNumber: "VFD-2-A-002444",
      lastDoneAcft: "6586.1",
      lastDoneTach: "6079.8",
      lastDoneDate: "6-Jan-24",
      nextDueAcft: "6386.1",
      nextDueTach: "6679.8",
      atlReference: "ATL-002525",
    },
    {
      id: 2,
      woNumber: "VFD-2-A-002451",
      lastDoneAcft: "6561.3",
      lastDoneTach: "6168.7",
      lastDoneDate: "7-Jul-23",
      nextDueAcft: "6586.1",
      nextDueTach: "6276.1",
      atlReference: "ATL-002412",
    },
    {
      id: 3,
      woNumber: "VFD-2-A-002458",
      lastDoneAcft: "6502.6",
      lastDoneTach: "6363.9",
      lastDoneDate: "18-Aug-23",
      nextDueAcft: "6586.1",
      nextDueTach: "6378.1",
      atlReference: "ATL-002458",
    },
    {
      id: 4,
      woNumber: "VFD-2-A-002467",
      lastDoneAcft: "6532.7",
      lastDoneTach: "6416.1",
      lastDoneDate: "23-Nov-23",
      nextDueAcft: "6586.1",
      nextDueTach: "6479.6",
      atlReference: "ATL-002788",
    },
    {
      id: 5,
      woNumber: "VFD-2-A-002475",
      lastDoneAcft: "6524.9",
      lastDoneTach: "6424.8",
      lastDoneDate: "27-Feb-24",
      nextDueAcft: "6586.1",
      nextDueTach: "6579.1",
      atlReference: "ATL-002835",
    },
    {
      id: 6,
      woNumber: "VFD-2-A-002484",
      lastDoneAcft: "6636.1",
      lastDoneTach: "6631.8",
      lastDoneDate: "16-Apr-24",
      nextDueAcft: "6886.1",
      nextDueTach: "6879.6",
      atlReference: "ATL-002986",
    },
    {
      id: 7,
      woNumber: "VFD-2-A-002491",
      lastDoneAcft: "6747.3",
      lastDoneTach: "6768.7",
      lastDoneDate: "05-May-24",
      nextDueAcft: "6786.1",
      nextDueTach: "6779.1",
      atlReference: "ATL-003048",
    },
    {
      id: 8,
      woNumber: "VFD-2-A-002498",
      lastDoneAcft: "6869.9",
      lastDoneTach: "6882.9",
      lastDoneDate: "09-Jul-2024",
      nextDueAcft: "6886.1",
      nextDueTach: "6879.6",
      atlReference: "ATL-003254",
    },
    {
      id: 9,
      woNumber: "VFD-2-A-002507",
      lastDoneAcft: "6996.7",
      lastDoneTach: "6986.1",
      lastDoneDate: "24-Aug-2024",
      nextDueAcft: "6986.1",
      nextDueTach: "6979.1",
      atlReference: "ATL-003257",
    },
  ];

  const adData = {
    title: "Work Orders",
    subtitle: "Inspection of Main Landing Gear Actuator",
    status: "Active",
    interval: "TBO Flight Hours",
    effectiveDate: "2023-01-15",
    workOrdersCount: 9,
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
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
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Work Order
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-gray-900">
            AD {adNumber} - {adData.title}
          </h2>
          <p className="text-gray-500 mt-1">{adData.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Info Section */}
          <div className="p-5 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-2">Status</div>
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs bg-green-50 text-green-700 border border-green-200">
                  {adData.status}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Interval</div>
                <div className="text-gray-900 text-sm">{adData.interval}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Effective Date</div>
                <div className="text-gray-900 text-sm">
                  {adData.effectiveDate}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2">Work Orders</div>
                <div className="text-gray-900 text-sm">
                  {adData.workOrdersCount}
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Work Orders Section */}
          <div className="p-5 border-b border-gray-200">
            <div className="text-gray-900 text-sm">Compliance Work Orders</div>
          </div>

          {/* AD Number Display */}
          <div className="py-6 text-center bg-gray-50">
            <div className="text-gray-900">AD NO. {adNumber}</div>
          </div>

          {/* Work Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-green-50 border-y border-gray-200">
                  <th
                    className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider"
                    rowSpan={2}
                  >
                    WO NUMBER
                  </th>
                  <th
                    className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider border-x border-gray-200"
                    colSpan={3}
                  >
                    LAST DONE
                  </th>
                  <th
                    className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider border-r border-gray-200"
                    colSpan={2}
                  >
                    NEXT DUE
                  </th>
                  <th
                    className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider"
                    rowSpan={2}
                  >
                    ATL REFERENCE
                  </th>
                </tr>
                <tr className="bg-green-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider border-l border-gray-200">
                    ACFT
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                    TACH
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider border-r border-gray-200">
                    DATE
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                    ACFT
                  </th>
                  <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider border-r border-gray-200">
                    TACH
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workOrders.map((wo) => (
                  <tr
                    key={wo.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {wo.woNumber}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 border-l border-gray-200">
                      {wo.lastDoneAcft}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {wo.lastDoneTach}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {wo.lastDoneDate}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900">
                      {wo.nextDueAcft}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 border-r border-gray-200">
                      {wo.nextDueTach}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <a
                        href="#"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {wo.atlReference}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Work Order Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900">Add Work Order</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Enter the compliance work order details for AD {adNumber}.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-5">
              {/* Work Order Number */}
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  Work Order Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 17212-A-000343"
                  value={formData.woNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, woNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Last Done Section */}
              <div>
                <div className="text-amber-600 text-sm mb-2">Last Done</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      ACTT
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 60"
                      value={formData.lastDoneAcft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastDoneAcft: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Tach
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 60"
                      value={formData.lastDoneTach}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lastDoneTach: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g., 6-Jan-24"
                        value={formData.lastDoneDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            lastDoneDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Calendar className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Due Section */}
              <div>
                <div className="text-amber-600 text-sm mb-2">Next Due</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      ACTT
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 6180.1"
                      value={formData.nextDueAcft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nextDueAcft: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Tach
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 6170.6"
                      value={formData.nextDueTach}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nextDueTach: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* ATL Reference */}
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  ATL Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g., ATL-0002226"
                  value={formData.atlReference}
                  onChange={(e) =>
                    setFormData({ ...formData, atlReference: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle form submission here
                  setShowAddModal(false);
                  // Reset form
                  setFormData({
                    woNumber: "",
                    lastDoneAcft: "",
                    lastDoneTach: "",
                    lastDoneDate: "",
                    nextDueAcft: "",
                    nextDueTach: "",
                    atlReference: "",
                  });
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors text-sm"
              >
                Add Work Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
