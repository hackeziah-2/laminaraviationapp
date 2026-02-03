import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { AddTCCModal } from './AddTCCModal';

interface ComponentItem {
  id: number;
  remaining: string;
  date: string;
  when: string;
  aptu: string;
  partNo: string;
  serialNo: string;
  description: string;
  hours: string;
  threshold: string;
  methodOfCompliance: string;
  lastDoneDate: string;
  lastDoneYear: string;
  lastDoneAptu: string;
  nextDueDate: string;
  nextDueYear: string;
  nextDueAptu: string;
  reference: string;
}

export function TCCDetail() {
  const { id, msn } = useParams<{ id: string; msn: string }>();
  const navigate = useNavigate();
  const msnNum = parseInt(msn || '1');

  const handleBack = () => {
    navigate(`/profile/${id}/maintenance-tcc`);
  };

  const [activeTab, setActiveTab] = useState<'POWERPLANT' | 'AIRFRAME' | 'PROPELLER'>('POWERPLANT');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddComponent = (component: any) => {
    console.log('New component added:', component);
    // Here you would typically add the component to your data store
  };

  // Sample data for Powerplant
  const powerplantData: ComponentItem[] = [
    {
      id: 1,
      remaining: '836',
      date: '0322',
      when: '2158',
      aptu: '',
      partNo: 'IO-360-L2A',
      serialNo: 'L-34520-48A',
      description: 'Engine Overhaul',
      hours: '12',
      threshold: '2000',
      methodOfCompliance: 'Overhaul',
      lastDoneDate: '5-Sep-23',
      lastDoneYear: '20323',
      lastDoneAptu: '678.0',
      nextDueDate: '5-Sep-25',
      nextDueYear: '2025',
      nextDueAptu: '2158.0',
      reference: 'SID-10835'
    },
    {
      id: 2,
      remaining: '1.01',
      date: '0322',
      when: '2158',
      aptu: '',
      partNo: '',
      serialNo: 'ADF00A01',
      description: 'Engine Compartment Firewall Fuel Gaps: Hoe Testing',
      hours: '12',
      threshold: '2000',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '5-Sep-23',
      lastDoneYear: '20323',
      lastDoneAptu: '678.0',
      nextDueDate: '5-Sep-25',
      nextDueYear: '2025',
      nextDueAptu: '4765.0',
      reference: 'ATL-18822'
    },
    {
      id: 3,
      remaining: '896',
      date: '1022',
      when: '2158',
      aptu: '',
      partNo: '',
      serialNo: '',
      description: 'Engine Oil Contamination Inspect and Replace',
      hours: '12',
      threshold: '2000',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '5-Sep-23',
      lastDoneYear: '20323',
      lastDoneAptu: '678.0',
      nextDueDate: '5-Sep-25',
      nextDueYear: '2025',
      nextDueAptu: '4765.0',
      reference: ''
    },
    {
      id: 4,
      remaining: '1.01',
      date: '185',
      when: '1916.0',
      aptu: '07865',
      partNo: '',
      serialNo: '',
      description: 'Air Filter',
      hours: '12',
      threshold: '2000',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '30-May-22',
      lastDoneYear: '20224',
      lastDoneAptu: '507.0',
      nextDueDate: '30-May-24',
      nextDueYear: '2024.4',
      nextDueAptu: '1916.0',
      reference: ''
    },
    {
      id: 5,
      remaining: '86',
      date: '466',
      when: '2158',
      aptu: '',
      partNo: '6438',
      serialNo: '6438',
      description: 'Fuel Selector',
      hours: '16',
      threshold: '600',
      methodOfCompliance: 'Overhaul',
      lastDoneDate: '5-Sep-23',
      lastDoneYear: '20234',
      lastDoneAptu: '678.0',
      nextDueDate: '5-Sep-27',
      nextDueYear: '2027.3',
      nextDoneAptu: '1916.0',
      reference: 'ATL-18232'
    },
    {
      id: 6,
      remaining: '1.01',
      date: '0',
      when: '1000.0',
      aptu: '07565',
      partNo: '07565',
      serialNo: '6738',
      description: 'Vac Check Valve',
      hours: '10',
      threshold: '400',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '8-Aug-17',
      lastDoneYear: '2017.6',
      lastDoneAptu: '4,833.0',
      nextDueDate: '8-Aug-19',
      nextDueYear: '2019.6',
      nextDueAptu: '2400.0',
      reference: 'ATL-16686'
    },
    {
      id: 7,
      remaining: '280',
      date: '1288',
      when: '2158',
      aptu: '',
      partNo: '',
      serialNo: '6-63576-5',
      description: 'Vacuum Diaphragm Filter',
      hours: '400',
      threshold: '800',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '5-Sep-20',
      lastDoneYear: '2020.7',
      lastDoneAptu: '1550.0',
      nextDueDate: '5-Sep-23',
      nextDueYear: '2023.7',
      nextDueAptu: '2350.0',
      reference: 'ATL-06240'
    },
    {
      id: 8,
      remaining: '2.25',
      date: '569',
      when: '1000.0',
      aptu: '64602',
      partNo: '64602',
      serialNo: '',
      description: 'Hose and Lines, Nozzl and Pressure',
      hours: '12',
      threshold: '400',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '6-Aug-17',
      lastDoneYear: '7026.2',
      lastDoneAptu: '7026.2',
      nextDueDate: '6-Aug-19',
      nextDueYear: '7026.2',
      nextDueAptu: '7026.2',
      reference: ''
    }
  ];

  // Sample data for Airframe
  const airframeData: ComponentItem[] = [
    {
      id: 1,
      remaining: '3.99',
      date: '0',
      when: '0.0',
      aptu: '',
      partNo: '28780',
      serialNo: '',
      description: 'Retractable Landing Gear (R. Part. MLG with Passenger)',
      hours: '01',
      threshold: '2000',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '31-May-04',
      lastDoneYear: '7387.7',
      lastDoneAptu: '',
      nextDueDate: '31-May-10',
      nextDueYear: '',
      nextDueAptu: '8927.7',
      reference: 'ATL-17054'
    },
    {
      id: 2,
      remaining: '3.00',
      date: '0',
      when: '0.0',
      aptu: '',
      partNo: '25754',
      serialNo: '',
      description: 'Landing Gear In - Bushing Kit',
      hours: '8',
      threshold: '',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '1-May-04',
      lastDoneYear: '',
      lastDoneAptu: '',
      nextDueDate: '',
      nextDueYear: '',
      nextDueAptu: '',
      reference: ''
    },
    {
      id: 3,
      remaining: '1.81',
      date: '848',
      when: '0.0',
      aptu: '',
      partNo: 'B-00730-8-A',
      serialNo: '419048',
      description: 'Aileron D - Landing Light Socket',
      hours: '',
      threshold: '',
      methodOfCompliance: 'Replacement',
      lastDoneDate: '10-Aug-90',
      lastDoneYear: '10-Aug-94',
      lastDoneAptu: '',
      nextDueDate: '',
      nextDueYear: '',
      nextDueAptu: '',
      reference: ''
    },
    {
      id: 4,
      remaining: '2.94',
      date: '1248',
      when: '0.0',
      aptu: '',
      partNo: '10-00730-2',
      serialNo: '',
      description: 'Stbd/board Landing Gear (Without skirt Light)',
      hours: '0',
      threshold: '',
      methodOfCompliance: 'Servicing',
      lastDoneDate: '10-Feb-2020',
      lastDoneYear: '',
      lastDoneAptu: '',
      nextDueDate: '10-Feb-2021',
      nextDueYear: '',
      nextDueAptu: '',
      reference: 'ATL-AT-55918'
    }
  ];

  // Sample data for Propeller
  const propellerData: ComponentItem[] = [
    {
      id: 1,
      remaining: '8.00',
      date: '995',
      when: '1994.0',
      aptu: '',
      partNo: 'HC-C2YK-1BF',
      serialNo: '89A23354',
      description: 'Propeller Hub Assy (Whhg) Inst',
      hours: '',
      threshold: '',
      methodOfCompliance: 'Overhaul',
      lastDoneDate: '5-Sep-22',
      lastDoneYear: '',
      lastDoneAptu: '',
      nextDueDate: '',
      nextDueYear: '',
      nextDueAptu: '',
      reference: 'ATL-C1803'
    },
    {
      id: 2,
      remaining: '1.04',
      date: '31',
      when: '1/4.0',
      aptu: '54.2',
      partNo: '',
      serialNo: '',
      description: 'First Saying Featuring System Spark Wear(Multiple)',
      hours: '0',
      threshold: '',
      methodOfCompliance: 'Inspection Test',
      lastDoneDate: '121-Feb-2019',
      lastDoneYear: '7028.3',
      lastDoneAptu: '7028.3',
      nextDueDate: '121-Feb-20',
      nextDueYear: '',
      nextDueAptu: '',
      reference: 'ATL-C1403'
    },
    {
      id: 3,
      remaining: '1.48',
      date: '589',
      when: '1994.0',
      aptu: '54.2',
      partNo: '',
      serialNo: '',
      description: 'Magneto Skive Oil, Drive and coupling Kit',
      hours: '3',
      threshold: '1000',
      methodOfCompliance: 'Servicing',
      lastDoneDate: '8-Apr-2020',
      lastDoneYear: '7028.4',
      lastDoneAptu: '7028.4',
      nextDueDate: '8-Apr-2020',
      nextDueYear: '8588.2',
      nextDueAptu: '8588.2',
      reference: 'ATL-C1403'
    },
    {
      id: 4,
      remaining: '2.10',
      date: '763',
      when: '1916.0',
      aptu: '54.2',
      partNo: '102-48',
      serialNo: '102.48',
      description: 'Windshield L - Vent Water Cleaner',
      hours: '5',
      threshold: '1000',
      methodOfCompliance: 'Servicing',
      lastDoneDate: '8-Apr-20',
      lastDoneYear: '7028.2',
      lastDoneAptu: '7028.2',
      nextDueDate: '8-Apr-20',
      nextDueYear: '8788.2',
      nextDueAptu: '8788.2',
      reference: 'ATL-C1403'
    },
    {
      id: 5,
      remaining: '2.94',
      date: '994',
      when: '1916.0',
      aptu: '54.2',
      partNo: '164-8',
      serialNo: '164-8',
      description: 'Pilot-arm Kit Variable Damper',
      hours: '5',
      threshold: '1000',
      methodOfCompliance: 'Servicing',
      lastDoneDate: '8-Apr-2020',
      lastDoneYear: '7028.6',
      lastDoneAptu: '7028.6',
      nextDueDate: '8-Apr-2020',
      nextDueYear: '8788.6',
      nextDueAptu: '8788.6',
      reference: 'ATL-C1403'
    },
    {
      id: 6,
      remaining: '2.10',
      date: '886',
      when: '1640.0',
      aptu: '54.03',
      partNo: '164-8',
      serialNo: '3-88.02',
      description: 'Cabin Window (HMS)',
      hours: '8',
      threshold: '',
      methodOfCompliance: 'Servicing',
      lastDoneDate: '8-Apr-2020',
      lastDoneYear: '7028.2',
      lastDoneAptu: '7028.2',
      nextDueDate: '8-Apr-2025',
      nextDueYear: '8788.2',
      nextDueAptu: '8788.2',
      reference: 'ATL-C1403'
    }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'POWERPLANT':
        return powerplantData;
      case 'AIRFRAME':
        return airframeData;
      case 'PROPELLER':
        return propellerData;
      default:
        return [];
    }
  };

  const getTabColor = () => {
    switch (activeTab) {
      case 'POWERPLANT':
        return 'bg-blue-600';
      case 'AIRFRAME':
        return 'bg-orange-600';
      case 'PROPELLER':
        return 'bg-teal-600';
      default:
        return 'bg-blue-600';
    }
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
              <h1 className="text-gray-900">Time Controlled components</h1>
              <p className="text-gray-600 text-sm mt-1">
                Track components by life limit and replacement schedules
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Component
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Aircraft Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <p className="text-gray-600 text-sm mb-4">Aircraft:</p>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-gray-500 text-xs mb-2">MSN</label>
              <div className="text-gray-900">{msn}</div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-2">TSN</label>
              <div className="text-gray-900">7561</div>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-2">CSN</label>
              <div className="text-gray-900">11656.0</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('POWERPLANT')}
            className={`px-6 py-2 rounded-lg text-sm transition-colors ${
              activeTab === 'POWERPLANT'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            POWERPLANT
          </button>
          <button
            onClick={() => setActiveTab('AIRFRAME')}
            className={`px-6 py-2 rounded-lg text-sm transition-colors ${
              activeTab === 'AIRFRAME'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            AIRFRAME
          </button>
          <button
            onClick={() => setActiveTab('PROPELLER')}
            className={`px-6 py-2 rounded-lg text-sm transition-colors ${
              activeTab === 'PROPELLER'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            PROPELLER
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className={`${getTabColor()} text-white px-4 py-2 text-xs flex items-center gap-3`}>
            <span className="uppercase">{activeTab}</span>
            <span className="text-white/80">({getCurrentData().length} components)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">REMAINING</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">DATE</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">WHEN</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">APTU</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">PART NO</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">SERIAL NO</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">DESCRIPTION</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">HOURS</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">THRESHOLD</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">METHOD OF COMPLIANCE</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">DATE</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">YEAR</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">APTU</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">DATE</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">YEAR</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap">APTU</th>
                  <th className="px-3 py-3 text-left text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">REFERENCE</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th colSpan={4} className="px-3 py-2 text-xs text-gray-600"></th>
                  <th colSpan={2} className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200">PART INFO</th>
                  <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"></th>
                  <th colSpan={2} className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200">COMPONENT LIMIT</th>
                  <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"></th>
                  <th colSpan={3} className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200">LAST DONE</th>
                  <th colSpan={3} className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200">NEXT DUE</th>
                  <th className="px-3 py-2 text-xs text-gray-600 border-l border-gray-200"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getCurrentData().map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.remaining}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.date}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.when}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.aptu}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.partNo}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.serialNo}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.description}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.hours}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.threshold}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.methodOfCompliance}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.lastDoneDate}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.lastDoneYear}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.lastDoneAptu}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.nextDueDate}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.nextDueYear}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs">{item.nextDueAptu}</td>
                    <td className="px-3 py-3 text-gray-900 text-xs border-l border-gray-200">{item.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Component Modal */}
      <AddTCCModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddComponent}
      />
    </div>
  );
}
