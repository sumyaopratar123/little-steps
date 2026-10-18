import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  DollarSign,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Clock,
  Eye,
  Activity
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [stats, setStats] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [activeTab, setActiveTab] = useState('verifications'); // 'verifications', 'users', 'bookings'

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, verifRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/verifications')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (verifRes.data.success) setVerifications(verifRes.data.data);
    } catch (err) {
      console.error('Failed to load admin metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userRoleFilter) params.set('role', userRoleFilter);
      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data.success) setUsersList(res.data.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (bookingStatusFilter) params.set('status', bookingStatusFilter);
      const res = await api.get(`/admin/bookings?${params.toString()}`);
      if (res.data.success) setBookingsList(res.data.data);
    } catch (err) {
      console.error('Failed to load bookings', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, userRoleFilter, bookingStatusFilter]);

  const handleVerifyProvider = async (providerId, action) => {
    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = window.prompt('Please provide a reason for rejection (sent to provider):');
      if (rejectionReason === null) return;
    }

    try {
      const res = await api.patch(`/admin/verifications/${providerId}`, {
        action,
        rejectionReason
      });

      if (res.data.success) {
        addToast(
          `Provider verification ${action === 'approve' ? 'approved' : 'rejected'}!`,
          action === 'approve' ? 'success' : 'info'
        );
        fetchDashboardData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Verification update failed', 'error');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    if (!window.confirm('Are you sure you want to change this user account status?')) return;
    try {
      const res = await api.patch(`/admin/users/${userId}/toggle-status`);
      if (res.data.success) {
        addToast(res.data.message, 'info');
        fetchUsers();
        fetchDashboardData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Status update failed', 'error');
    }
  };

  const handleForceCancelBooking = async (bookingId) => {
    const reason = window.prompt('Enter reason for admin cancellation:');
    if (reason === null) return;

    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'cancelled',
        cancellationReason: `Admin Resolution: ${reason || 'Administrative action'}`
      });

      if (res.data.success) {
        addToast('Booking cancelled by administrator', 'info');
        fetchBookings();
        fetchDashboardData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
            Administrative Control Center
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Little Steps Platform Ops
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Supervise safety background verifications, audit childcare bookings, and moderate users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            Admin Mode Active
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.users.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {stats.users.totalParents} parents • {stats.users.totalProviders} caregivers
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Pending Verifications
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600 mt-2">
              {stats.providers.pending}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {stats.providers.verified} verified • {stats.providers.rejected} rejected
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Platform Bookings</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.bookings.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {stats.bookings.completed} completed • {stats.bookings.inProgress} in care
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Gross Care Volume
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              ${stats.financials.totalCompletedVolume}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ${stats.financials.totalPlatformFees} platform fees earned
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`pb-3 relative transition-colors flex items-center gap-2 ${
            activeTab === 'verifications'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Pending Verifications ({verifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 relative transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Moderation</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 relative transition-colors flex items-center gap-2 ${
            activeTab === 'bookings'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Platform Bookings Audit</span>
        </button>
      </div>

      {/* Tab 1: Verification Queue */}
      {activeTab === 'verifications' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Provider Background Verification Review Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect applicant credentials and approve verified trust badges.
              </p>
            </div>
          </div>

          {verifications.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-slate-800">Verification Queue Clear!</p>
              <p className="text-xs text-slate-500">
                All submitted provider background checks and licenses have been reviewed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {verifications.map((v) => (
                <div
                  key={v._id}
                  className="p-6 rounded-2xl border border-amber-200 bg-amber-50/20 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{v.user?.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pending Review
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                        <span>Email: {v.user?.email}</span>
                        <span>•</span>
                        <span>Phone: {v.user?.phone || 'Not provided'}</span>
                        <span>•</span>
                        <span>City: {v.city}</span>
                        <span>•</span>
                        <span>Exp: {v.experienceYears || 0} years</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyProvider(v._id, 'approve')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Verify</span>
                      </button>
                      <button
                        onClick={() => handleVerifyProvider(v._id, 'reject')}
                        className="px-3.5 py-2 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                    "{v.bio}"
                  </p>

                  {/* Submitted documents pills */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Submitted Clearance Documents:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(v.verificationDocuments || []).map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{doc.docType}:</span>
                          <span className="text-slate-500 font-normal">{doc.fileName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Moderation */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Moderation & Account Status</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                View platform users and manage account access.
              </p>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-white"
              >
                <option value="">All Roles</option>
                <option value="parent">Parents</option>
                <option value="provider">Providers</option>
                <option value="admin">Admins</option>
              </select>

              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3">User</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Contact</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-bold text-slate-900">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-100 text-rose-800'
                            : u.role === 'provider'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{u.phone || 'N/A'}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {u._id !== user._id && (
                        <button
                          onClick={() => handleToggleUserStatus(u._id)}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                            u.isActive
                              ? 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Platform Bookings Audit */}
      {activeTab === 'bookings' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Platform Bookings Audit Trail</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit all childcare reservations across the Little Steps platform.
              </p>
            </div>

            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-progress">In-Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3">Booking ID</th>
                  <th className="py-3">Family (Parent)</th>
                  <th className="py-3">Caregiver (Provider)</th>
                  <th className="py-3">Date & Hours</th>
                  <th className="py-3">Children</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookingsList.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-bold text-slate-500">
                      #{b._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 font-semibold text-slate-900">
                      {b.parent?.name || 'Parent'}
                    </td>
                    <td className="py-3 font-semibold text-slate-900">
                      {b.provider?.name || 'Provider'}
                    </td>
                    <td className="py-3 text-slate-600">
                      <div>{b.dateString}</div>
                      <div className="text-[10px] text-slate-400">
                        {b.startTime} - {b.endTime} {b.isOvernight ? '(24/7 Overnight)' : ''}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">
                      {b.childDetails?.map((c) => c.name).join(', ')} ({b.numberOfChildren})
                    </td>
                    <td className="py-3 font-bold text-slate-900">${b.totalAmount}</td>
                    <td className="py-3">
                      <StatusBadge status={b.status} type="booking" />
                    </td>
                    <td className="py-3 text-right">
                      {['pending', 'confirmed', 'in-progress'].includes(b.status) && (
                        <button
                          onClick={() => handleForceCancelBooking(b._id)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-50"
                        >
                          Force Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
