import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddTCCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (component: any) => void;
}

export function AddTCCModal({ isOpen, onClose, onAdd }: AddTCCModalProps) {
  const [formData, setFormData] = useState({
    category: '',
    partNumber: '',
    serialNumber: '',
    description: '',
    componentLimit: '',
    timeDistance: '',
    methodOfCompliance: '',
    reference: '',
    lastDoneDate: '',
    lastDoneYear: '',
    lastDoneAFTF: '',
    nextDueDate: '',
    nextDueYear: '',
    nextDueAFTF: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
    // Reset form
    setFormData({
      category: '',
      partNumber: '',
      serialNumber: '',
      description: '',
      componentLimit: '',
      timeDistance: '',
      methodOfCompliance: '',
      reference: '',
      lastDoneDate: '',
      lastDoneYear: '',
      lastDoneAFTF: '',
      nextDueDate: '',
      nextDueYear: '',
      nextDueAFTF: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-gray-900">Add TCC Entry</h2>
            <p className="text-gray-600 text-sm mt-1">
              Enter the details for the new time-controlled component.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Category and Part Number */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-900 text-sm mb-2">Category</label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  <option value="">Select category</option>
                  <option value="POWERPLANT">POWERPLANT</option>
                  <option value="AIRFRAME">AIRFRAME</option>
                  <option value="PROPELLER">PROPELLER</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">Part Number</label>
              <input
                type="text"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleChange}
                placeholder="Enter part number"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Serial Number */}
          <div className="mb-4">
            <label className="block text-gray-900 text-sm mb-2">Serial Number</label>
            <input
              type="text"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="Enter serial number"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-gray-900 text-sm mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter component description"
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Component Limit and Time/Distance */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-900 text-sm mb-2">Component Limit (Hours)</label>
              <input
                type="number"
                name="componentLimit"
                value={formData.componentLimit}
                onChange={handleChange}
                placeholder="Enter limit in hours"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">Time/Distance</label>
              <input
                type="text"
                name="timeDistance"
                value={formData.timeDistance}
                onChange={handleChange}
                placeholder="Enter time/distance"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Method of Compliance and Reference */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-900 text-sm mb-2">Method of Compliance</label>
              <div className="relative">
                <select
                  name="methodOfCompliance"
                  value={formData.methodOfCompliance}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px'
                  }}
                >
                  <option value="">Select method</option>
                  <option value="Overhaul">Overhaul</option>
                  <option value="Replacement">Replacement</option>
                  <option value="Servicing">Servicing</option>
                  <option value="Inspection">Inspection</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">Reference</label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="Enter reference"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Last Done Section */}
          <div className="mb-4">
            <label className="block text-gray-900 text-sm mb-3">Last Done</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-900 text-xs mb-2">Date</label>
                <input
                  type="text"
                  name="lastDoneDate"
                  value={formData.lastDoneDate}
                  onChange={handleChange}
                  placeholder="DD-MMM-YY"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-900 text-xs mb-2">Year</label>
                <input
                  type="number"
                  name="lastDoneYear"
                  value={formData.lastDoneYear}
                  onChange={handleChange}
                  placeholder="Enter year"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-900 text-xs mb-2">AFTF</label>
                <input
                  type="text"
                  name="lastDoneAFTF"
                  value={formData.lastDoneAFTF}
                  onChange={handleChange}
                  placeholder="Enter AFTF"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Next Due Section */}
          <div className="mb-6">
            <label className="block text-gray-900 text-sm mb-3">Next Due</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-900 text-xs mb-2">Date</label>
                <input
                  type="text"
                  name="nextDueDate"
                  value={formData.nextDueDate}
                  onChange={handleChange}
                  placeholder="DD-MMM-YY"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-900 text-xs mb-2">Year</label>
                <input
                  type="number"
                  name="nextDueYear"
                  value={formData.nextDueYear}
                  onChange={handleChange}
                  placeholder="Enter year"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-900 text-xs mb-2">AFTF</label>
                <input
                  type="text"
                  name="nextDueAFTF"
                  value={formData.nextDueAFTF}
                  onChange={handleChange}
                  placeholder="Enter AFTF"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Add TCC Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
