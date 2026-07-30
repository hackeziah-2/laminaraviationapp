import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUserPermissions } from '../hooks/useUserPermissions';

const defaultFormData = {
  inspectionType: '',
  zoneArea: '',
  inspectionDate: '',
  inspector: '',
  nextDueDate: '',
  status: 'Current',
  findings: '',
  correctiveAction: '',
  referenceDocNo: ''
};

interface AddInspectionModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  /** Optional initial values for edit mode */
  initialData?: Record<string, string>;
  /** When true, show "Edit" instead of "Add" in title */
  isEdit?: boolean;
}

const REQUIRED_FIELDS: { key: keyof typeof defaultFormData; label: string }[] = [
  { key: 'inspectionType', label: 'Inspection type' },
  { key: 'zoneArea', label: 'Zone/area' },
  { key: 'inspectionDate', label: 'Inspection date' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'nextDueDate', label: 'Next due date' },
  { key: 'status', label: 'Status' },
];

export function AddInspectionModal({ onClose, onSubmit, initialData, isEdit }: AddInspectionModalProps) {
  const { canUpdate, canCreate } = useUserPermissions();
  const [formData, setFormData] = useState(() => ({
    ...defaultFormData,
    ...(initialData && typeof initialData === 'object' ? initialData : {}),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    for (const { key, label } of REQUIRED_FIELDS) {
      const value = String(formData[key] ?? '').trim();
      if (!value) newErrors[key] = `${label} is required`;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit(formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const fieldClass = (name: string) =>
    `w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent hover:border-gray-300 transition-colors ${
      errors[name] ? 'border-red-500' : 'border-gray-200'
    }`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-6">
            {/* Inspection Details Section */}
            <div>
              <h3 className="text-gray-900 mb-4">Inspection Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Inspection Type */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Inspection Type *
                  </label>
                  <select
                    name="inspectionType"
                    value={formData.inspectionType}
                    onChange={handleChange}
                    className={`${fieldClass('inspectionType')} cursor-pointer`}
                  >
                    <option value="">Select type</option>
                    <option value="IO 1">IO 1 - Records Inspection</option>
                    <option value="IO 2">IO 2 - Baseline Program</option>
                    <option value="IO 3">IO 3 - Baseline Program</option>
                    <option value="IO 4">IO 4 - Baseline Program</option>
                    <option value="IO 5">IO 5 - Baseline Program</option>
                    <option value="IO 6">IO 6 - Baseline Program</option>
                    <option value="IO 7">IO 7 - Protective Finish</option>
                    <option value="IO 8">IO 8 - Wing Inspection</option>
                    <option value="IO 9">IO 9 - Fuselage Inspection</option>
                    <option value="IO 10">IO 10 - Landing Gear Inspection</option>
                  </select>
                  {errors.inspectionType && (
                    <p className="mt-1 text-xs text-red-600">{errors.inspectionType}</p>
                  )}
                </div>

                {/* Zone/Area */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Zone/Area *
                  </label>
                  <input
                    type="text"
                    name="zoneArea"
                    value={formData.zoneArea}
                    onChange={handleChange}
                    placeholder="e.g., Zone 100, Fuselage Forward"
                    className={fieldClass('zoneArea')}
                  />
                  {errors.zoneArea && (
                    <p className="mt-1 text-xs text-red-600">{errors.zoneArea}</p>
                  )}
                </div>

                {/* Inspection Date */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Inspection Date *
                  </label>
                  <input
                    type="text"
                    name="inspectionDate"
                    value={formData.inspectionDate}
                    onChange={handleChange}
                    placeholder="11/15/2025"
                    className={fieldClass('inspectionDate')}
                  />
                  {errors.inspectionDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.inspectionDate}</p>
                  )}
                </div>

                {/* Inspector */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Inspector *
                  </label>
                  <input
                    type="text"
                    name="inspector"
                    value={formData.inspector}
                    onChange={handleChange}
                    placeholder="e.g., John Smith"
                    className={fieldClass('inspector')}
                  />
                  {errors.inspector && (
                    <p className="mt-1 text-xs text-red-600">{errors.inspector}</p>
                  )}
                </div>

                {/* Next Due Date */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Next Due Date *
                  </label>
                  <input
                    type="text"
                    name="nextDueDate"
                    value={formData.nextDueDate}
                    onChange={handleChange}
                    placeholder="11/15/2025"
                    className={fieldClass('nextDueDate')}
                  />
                  {errors.nextDueDate && (
                    <p className="mt-1 text-xs text-red-600">{errors.nextDueDate}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className={`${fieldClass('status')} cursor-pointer`}
                  >
                    <option value="Current">Current</option>
                    <option value="Due">Due</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Completed">Completed</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-xs text-red-600">{errors.status}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Findings and Actions Section */}
            <div>
              <h3 className="text-gray-900 mb-4">Findings and Actions</h3>
              
              <div className="space-y-4">
                {/* Findings */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Findings
                  </label>
                  <textarea
                    name="findings"
                    value={formData.findings}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe any findings from the inspection..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent hover:border-gray-300 transition-colors resize-none"
                  />
                </div>

                {/* Corrective Action */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Corrective Action
                  </label>
                  <textarea
                    name="correctiveAction"
                    value={formData.correctiveAction}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe corrective actions taken or required..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent hover:border-gray-300 transition-colors resize-none"
                  />
                </div>

                {/* Reference Document No */}
                <div>
                  <label className="block text-sm text-gray-900 mb-1.5">
                    Reference Document No.
                  </label>
                  <input
                    type="text"
                    name="referenceDocNo"
                    value={formData.referenceDocNo}
                    onChange={handleChange}
                    placeholder="e.g., DOC-2025-001"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent hover:border-gray-300 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {(isEdit ? canUpdate('cpcp') : canCreate('cpcp')) && (
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isEdit ? 'Update Inspection' : 'Add Inspection'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
