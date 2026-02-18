import React, { useState } from 'react';
import { Users, Shield, Grid3x3, Plus, Search, Edit2, Lock, UserX, ChevronDown, ChevronUp, Check, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdDate: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  userCount: number;
}

interface Permission {
  module: string;
  read: boolean;
  write: boolean;
  approve: boolean;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (user: any) => void;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (user: User) => void;
}

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: () => void;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onReset: (forceChange: boolean) => void;
}

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
  onUpdate: (role: Role, permissions: Permission[]) => void;
}

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (role: Role, permissions: Permission[]) => void;
}

// Add User Modal
function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onAdd(formData);
      setFormData({ name: '', email: '', role: 'Viewer', password: '', confirmPassword: '' });
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
          <p className="text-sm text-gray-600 mt-1">Create a new user account with role assignment</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter full name"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="user@aviation.com"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Admin">Admin</option>
              <option value="Planner">Planner</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Viewer">Viewer</option>
              <option value="Auditor">Auditor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Re-enter password"
            />
            {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              User will receive an email notification with their login credentials and will be prompted to change their password on first login.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setFormData({ name: '', email: '', role: 'Viewer', password: '', confirmPassword: '' });
                setErrors({});
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal
function EditUserModal({ isOpen, onClose, user, onUpdate }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'Viewer',
    status: user?.status || 'active'
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...user,
      ...formData
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <p className="text-sm text-gray-600 mt-1">Update user information and permissions</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Admin">Admin</option>
              <option value="Planner">Planner</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Viewer">Viewer</option>
              <option value="Auditor">Auditor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Deactivate User Modal
function DeactivateUserModal({ isOpen, onClose, user, onConfirm }: DeactivateUserModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            {user.status === 'active' ? 'Deactivate User?' : 'Activate User?'}
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            {user.status === 'active' 
              ? `Are you sure you want to deactivate ${user.name}? They will lose access to the system immediately.`
              : `Are you sure you want to activate ${user.name}? They will regain access to the system.`
            }
          </p>

          <div className="space-y-3 mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">User:</span>
              <span className="font-medium text-gray-900">{user.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium text-gray-900">{user.role}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-2 ${
                user.status === 'active' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } text-white rounded-lg transition-colors`}
            >
              {user.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reset Password Modal
function ResetPasswordModal({ isOpen, onClose, user, onReset }: ResetPasswordModalProps) {
  const [forceChange, setForceChange] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen || !user) return null;

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
          <p className="text-sm text-gray-600 mt-1">Reset password for {user.name}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={generatePassword}
                type="button"
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forceChange"
              checked={forceChange}
              onChange={(e) => setForceChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="forceChange" className="text-sm text-gray-700">
              Force password change on next login
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              The user will receive an email with their new password. Make sure to securely communicate this password if email is not available.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onReset(forceChange);
                onClose();
              }}
              disabled={!newPassword}
              type="button"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Role Modal
function EditRoleModal({ isOpen, onClose, role, permissions, onUpdate }: EditRoleModalProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || ''
  });
  const [rolePermissions, setRolePermissions] = useState<Permission[]>(permissions);

  React.useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description
      });
      setRolePermissions(permissions);
    }
  }, [role, permissions]);

  if (!isOpen || !role) return null;

  const togglePermission = (index: number, field: 'read' | 'write' | 'approve') => {
    const updated = [...rolePermissions];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setRolePermissions(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Role</h2>
          <p className="text-sm text-gray-600 mt-1">Modify role details and permissions</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Count</label>
              <input
                type="text"
                value={`${role.userCount} users`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Module Permissions</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Module</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Read</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Write</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rolePermissions.map((perm, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{perm.module}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.read}
                          onChange={() => togglePermission(index, 'read')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.write}
                          onChange={() => togglePermission(index, 'write')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.approve}
                          onChange={() => togglePermission(index, 'approve')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onUpdate({ ...role, ...formData }, rolePermissions);
                onClose();
              }}
              type="button"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Role Modal
function CreateRoleModal({ isOpen, onClose, onCreate }: CreateRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [permissions, setPermissions] = useState<Permission[]>([
    { module: 'Dashboard', read: false, write: false, approve: false },
    { module: 'Aircraft Fleet Daily Update', read: false, write: false, approve: false },
    { module: 'Aircraft Fleet Profile', read: false, write: false, approve: false },
    { module: 'Aircraft Technical Logbook', read: false, write: false, approve: false },
    { module: 'Maintenance Scheduling', read: false, write: false, approve: false },
    { module: 'Time Controlled Components', read: false, write: false, approve: false },
    { module: 'User Management', read: false, write: false, approve: false },
    { module: 'System Settings', read: false, write: false, approve: false }
  ]);

  if (!isOpen) return null;

  const togglePermission = (index: number, field: 'read' | 'write' | 'approve') => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setPermissions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      id: Date.now(),
      name: formData.name,
      description: formData.description,
      userCount: 0
    }, permissions);
    setFormData({ name: '', description: '' });
    setPermissions(permissions.map(p => ({ ...p, read: false, write: false, approve: false })));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Role</h2>
          <p className="text-sm text-gray-600 mt-1">Define a custom role with specific permissions</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Senior Mechanic"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the role's responsibilities and access level"
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Module Permissions</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Module</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Read</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Write</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {permissions.map((perm, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{perm.module}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.read}
                          onChange={() => togglePermission(index, 'read')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.write}
                          onChange={() => togglePermission(index, 'write')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.approve}
                          onChange={() => togglePermission(index, 'approve')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setFormData({ name: '', description: '' });
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeSection, setActiveSection] = useState<'users' | 'roles' | 'matrix'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('Admin');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<Role | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [customPermissions, setCustomPermissions] = useState<Record<string, Permission[]>>({});

  // Mock data
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@aviation.com',
      role: 'Admin',
      status: 'active',
      lastLogin: '2 hours ago',
      createdDate: '15-Jan-2024'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@aviation.com',
      role: 'Planner',
      status: 'active',
      lastLogin: '1 day ago',
      createdDate: '10-Jan-2024'
    },
    {
      id: 3,
      name: 'Michael Chen',
      email: 'michael.chen@aviation.com',
      role: 'Mechanic',
      status: 'active',
      lastLogin: '3 hours ago',
      createdDate: '08-Jan-2024'
    },
    {
      id: 4,
      name: 'Emily Davis',
      email: 'emily.davis@aviation.com',
      role: 'Viewer',
      status: 'active',
      lastLogin: '5 days ago',
      createdDate: '05-Jan-2024'
    },
    {
      id: 5,
      name: 'Robert Wilson',
      email: 'robert.wilson@aviation.com',
      role: 'Auditor',
      status: 'inactive',
      lastLogin: '2 weeks ago',
      createdDate: '01-Dec-2023'
    }
  ]);

  const [roles, setRoles] = useState<Role[]>([
    { id: 1, name: 'Admin', description: 'Full system access with all privileges', userCount: 2 },
    { id: 2, name: 'Planner', description: 'Plan and schedule maintenance activities', userCount: 5 },
    { id: 3, name: 'Mechanic', description: 'Execute maintenance tasks and update logs', userCount: 12 },
    { id: 4, name: 'Viewer', description: 'Read-only access to system data', userCount: 8 },
    { id: 5, name: 'Auditor', description: 'Review and audit compliance records', userCount: 3 }
  ]);

  const permissionsByRole: Record<string, Permission[]> = {
    Admin: [
      { module: 'Dashboard', read: true, write: true, approve: true },
      { module: 'Aircraft Fleet Daily Update', read: true, write: true, approve: true },
      { module: 'Aircraft Fleet Profile', read: true, write: true, approve: true },
      { module: 'Aircraft Technical Logbook', read: true, write: true, approve: true },
      { module: 'Maintenance Scheduling', read: true, write: true, approve: true },
      { module: 'Time Controlled Components', read: true, write: true, approve: true },
      { module: 'User Management', read: true, write: true, approve: true },
      { module: 'System Settings', read: true, write: true, approve: true }
    ],
    Planner: [
      { module: 'Dashboard', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Daily Update', read: true, write: true, approve: false },
      { module: 'Aircraft Fleet Profile', read: true, write: true, approve: false },
      { module: 'Aircraft Technical Logbook', read: true, write: true, approve: false },
      { module: 'Maintenance Scheduling', read: true, write: true, approve: true },
      { module: 'Time Controlled Components', read: true, write: true, approve: false },
      { module: 'User Management', read: false, write: false, approve: false },
      { module: 'System Settings', read: false, write: false, approve: false }
    ],
    Mechanic: [
      { module: 'Dashboard', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Daily Update', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Profile', read: true, write: false, approve: false },
      { module: 'Aircraft Technical Logbook', read: true, write: true, approve: false },
      { module: 'Maintenance Scheduling', read: true, write: false, approve: false },
      { module: 'Time Controlled Components', read: true, write: false, approve: false },
      { module: 'User Management', read: false, write: false, approve: false },
      { module: 'System Settings', read: false, write: false, approve: false }
    ],
    Viewer: [
      { module: 'Dashboard', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Daily Update', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Profile', read: true, write: false, approve: false },
      { module: 'Aircraft Technical Logbook', read: true, write: false, approve: false },
      { module: 'Maintenance Scheduling', read: true, write: false, approve: false },
      { module: 'Time Controlled Components', read: true, write: false, approve: false },
      { module: 'User Management', read: false, write: false, approve: false },
      { module: 'System Settings', read: false, write: false, approve: false }
    ],
    Auditor: [
      { module: 'Dashboard', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Daily Update', read: true, write: false, approve: false },
      { module: 'Aircraft Fleet Profile', read: true, write: false, approve: true },
      { module: 'Aircraft Technical Logbook', read: true, write: false, approve: true },
      { module: 'Maintenance Scheduling', read: true, write: false, approve: false },
      { module: 'Time Controlled Components', read: true, write: false, approve: true },
      { module: 'User Management', read: false, write: false, approve: false },
      { module: 'System Settings', read: false, write: false, approve: false }
    ]
  };

  const matrixPermissions = customPermissions[selectedRole] ?? permissionsByRole[selectedRole] ?? [];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-700';
      case 'Planner':
        return 'bg-blue-100 text-blue-700';
      case 'Mechanic':
        return 'bg-orange-100 text-orange-700';
      case 'Viewer':
        return 'bg-gray-100 text-gray-700';
      case 'Auditor':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-gray-900">Settings</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage system settings, user access, and permissions
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* Section Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveSection('users')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeSection === 'users'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts
          </button>
          <button
            onClick={() => setActiveSection('roles')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeSection === 'roles'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveSection('matrix')}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              activeSection === 'matrix'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Access Matrix
          </button>
        </div>

        {/* User Accounts Section */}
        {activeSection === 'users' && (
          <div>
            {/* Search and Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.lastLogin}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.createdDate}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                              type="button"
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="More actions"
                            >
                              {expandedUser === user.id ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditUserModal(true);
                              }}
                              type="button"
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowResetPasswordModal(true);
                              }}
                              type="button"
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Reset password"
                            >
                              <Lock className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeactivateModal(true);
                              }}
                              type="button"
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate user"
                            >
                              <UserX className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedUser === user.id && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <div className="flex gap-3">
                                <button type="button" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                                  Change Role
                                </button>
                                <button type="button" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                                  Force Password Change
                                </button>
                                <button type="button" className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                                  View Audit Trail
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Roles & Permissions Section */}
        {activeSection === 'roles' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {roles.map((role) => (
                <div key={role.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{role.name}</h3>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role.name)}`}>
                      {role.userCount} users
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRoleForEdit(role);
                        setShowEditRoleModal(true);
                      }}
                      type="button"
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Edit Permissions
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRoleForEdit(role);
                        setShowEditRoleModal(true);
                      }}
                      type="button"
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Role */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setShowCreateRoleModal(true)}
              onKeyDown={(e) => e.key === 'Enter' && setShowCreateRoleModal(true)}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
            >
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-gray-700 font-medium mb-1">Create New Role</h3>
              <p className="text-sm text-gray-500">Define custom roles with specific permissions</p>
            </div>
          </div>
        )}

        {/* Access Matrix Section */}
        {activeSection === 'matrix' && (
          <div>
            {/* Role Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Select Role to View Permissions</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            {/* Permissions Matrix */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">Module</th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">Read</th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">Write</th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {matrixPermissions.map((permission, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{permission.module}</td>
                      <td className="px-6 py-4 text-center">
                        {permission.read ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {permission.write ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {permission.approve ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Override Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">Permission Overrides</h4>
                  <p className="text-sm text-blue-700">
                    Individual users can have permission overrides that differ from their role. All overrides are logged in the audit trail.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onAdd={(newUser) => {
          const user: User = {
            id: users.length + 1,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: 'active',
            lastLogin: 'Never',
            createdDate: new Date().toLocaleDateString()
          };
          setUsers([...users, user]);
          alert(`User ${newUser.name} has been added successfully!`);
        }}
      />

      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUpdate={(updatedUser) => {
          setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
          alert(`User ${updatedUser.name} has been updated successfully!`);
        }}
      />

      <DeactivateUserModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={() => {
          if (selectedUser) {
            setUsers(users.map(u => 
              u.id === selectedUser.id 
                ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
                : u
            ));
            alert(`User ${selectedUser.name} has been ${selectedUser.status === 'active' ? 'deactivated' : 'activated'}!`);
          }
        }}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onReset={(forceChange) => {
          if (selectedUser) {
            alert(`Password reset email sent to ${selectedUser.name}. Force change on next login: ${forceChange ? 'Yes' : 'No'}`);
          }
        }}
      />

      <EditRoleModal
        isOpen={showEditRoleModal}
        onClose={() => {
          setShowEditRoleModal(false);
          setSelectedRoleForEdit(null);
        }}
        role={selectedRoleForEdit}
        permissions={selectedRoleForEdit ? (customPermissions[selectedRoleForEdit.name] ?? permissionsByRole[selectedRoleForEdit.name] ?? []) : []}
        onUpdate={(updatedRole, updatedPermissions) => {
          setRoles(roles.map(r => r.id === updatedRole.id ? updatedRole : r));
          setCustomPermissions(prev => ({ ...prev, [updatedRole.name]: updatedPermissions }));
          alert(`Role ${updatedRole.name} has been updated successfully!`);
        }}
      />

      <CreateRoleModal
        isOpen={showCreateRoleModal}
        onClose={() => setShowCreateRoleModal(false)}
        onCreate={(newRole, permissions) => {
          setRoles([...roles, newRole]);
          setCustomPermissions(prev => ({ ...prev, [newRole.name]: permissions }));
          alert(`Role ${newRole.name} has been created successfully!`);
        }}
      />
    </div>
  );
}
