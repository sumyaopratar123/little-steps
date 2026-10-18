import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  UploadCloud,
  DollarSign,
  Users,
  Moon,
  Calendar,
  AlertCircle,
  Save,
  PhoneCall,
  Baby
} from 'lucide-react';

const ALL_SERVICES = [
  'Infant Care (0-1 yr)',
  'Toddler Care (1-3 yrs)',
  'Preschool Care (3-5 yrs)',
  'Overnight / 24x7 Care',
  'After-School Care',
  'Special Needs Support',
  'Weekend Care',
  'Emergency Drop-in'
];

const ProviderDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Form state
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState(25);
  const [overnightRate, setOvernightRate] = useState(30);
  const [maxCapacity, setMaxCapacity] = useState(3);
  const [is24x7Available, setIs24x7Available] = useState(false);
  const [services, setServices] = useState([]);
  const [city, setCity] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Document Upload state
  const [docType, setDocType] = useState('Criminal Background Check');
  const [fileName, setFileName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchProviderData = async () => {
    setLoading(true);
    try {
      const [meRes, bookingsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/bookings')
      ]);

      if (meRes.data.success) {
        const prof = meRes.data.user.providerProfile || {};
        setProfile(prof);
        setBio(prof.bio || '');
        setHourlyRate(prof.hourlyRate || 25);
        setOvernightRate(prof.overnightRate || 30);
        setMaxCapacity(prof.maxCapacity || 3);
        setIs24x7Available(Boolean(prof.is24x7Available));
        setServices(prof.services || []);
        setCity(prof.city || meRes.data.user.address?.city || 'San Francisco');
      }

      if (bookingsRes.data.success) {
        setBookings(bookingsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load provider data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/providers/profile/update', {
        bio,
        hourlyRate: Number(hourlyRate),
        overnightRate: Number(overnightRate),
        maxCapacity: Number(maxCapacity),
        is24x7Available,
        services,
        city
      });

      if (res.data.success) {
        setProfile(res.data.data);
        addToast('Profile & rates updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!fileName.trim()) {
      addToast('Please enter document file name or details', 'warning');
      return;
    }

    setUploadingDoc(true);
    try {
      const res = await api.post('/providers/verification-docs', {
        docType,
        fileName: fileName.trim(),
        documentUrl: `https://storage.littlesteps.local/docs/${Date.now()}-${fileName.trim()}`
      });

      if (res.data.success) {
        setProfile(res.data.data);
        addToast(`Document submitted for Admin Review: ${docType}`, 'success');
        setFileName('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit document', 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, { status });
      if (res.data.success) {
        addToast(`Booking updated to ${status.toUpperCase()}!`, 'success');
        fetchProviderData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const activeBookings = bookings.filter((b) => ['confirmed', 'in-progress'].includes(b.status));
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.subtotal || 0), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === 'verified';
  const isPending = profile?.verificationStatus === 'pending';
  const isRejected = profile?.verificationStatus === 'rejected';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Caregiver Hub
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {user?.name}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage your credentials, 24/7 care availability, hourly rates, and incoming family requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={profile?.verificationStatus || 'pending'} type="verification" />
        </div>
      </div>

      {/* Verification Status Banner */}
      {isVerified ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-emerald-950 text-sm">Verified Caregiver Badge Active</h3>
              <p className="text-emerald-700 text-xs mt-0.5">
                Your profile and background credentials are approved. You are discoverable in public parent searches.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full shrink-0">
            Active in Search
          </span>
        </div>
      ) : isPending ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-amber-950 text-sm">Verification Under Review</h3>
            <p className="text-amber-800">
              Your background clearance credentials are currently being reviewed by Little Steps administrators. Once verified, parents can book your open slots directly.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-rose-950 text-sm">Action Required: Verification Pending</h3>
            <p className="text-rose-800">
              {profile?.rejectionReason
                ? `Safety team feedback: "${profile.rejectionReason}". Please re-submit valid documents below.`
                : 'Please upload your Government ID and Criminal Background Check to activate your provider profile.'}
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Earned</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">${totalEarnings}</p>
          <span className="text-[10px] text-slate-500">From {completedBookings.length} completed sessions</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Requests</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingRequests.length}</p>
          <span className="text-[10px] text-slate-500">Awaiting your response</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Bookings</p>
          <p className="text-2xl font-extrabold text-indigo-600 mt-1">{activeBookings.length}</p>
          <span className="text-[10px] text-slate-500">Confirmed or in-progress</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rating & Trust</p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">
            ★ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}
          </p>
          <span className="text-[10px] text-slate-500">{profile?.reviewCount || 0} parent reviews</span>
        </div>
      </div>

      {/* Section: Incoming Booking Requests */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>New Booking Requests ({pendingRequests.length})</span>
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No pending requests right now.</p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((b) => (
              <div
                key={b._id}
                className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{b.parent?.name}</span>
                    <span className="text-xs text-slate-500">({b.parent?.phone})</span>
                    {b.isOvernight && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        24/7 Overnight
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap gap-2">
                    <span className="font-semibold">{b.dateString}</span>
                    <span>•</span>
                    <span>{b.startTime} - {b.endTime} ({b.totalHours} hrs)</span>
                    <span>•</span>
                    <span>Children: {b.childDetails?.map((c) => `${c.name} (${c.age}y)`).join(', ')}</span>
                  </div>

                  {b.specialInstructions && (
                    <p className="text-[11px] text-slate-600 italic">
                      Special requests: "{b.specialInstructions}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900">${b.totalAmount}</p>
                    <p className="text-[10px] text-slate-500">${b.subtotal} payout</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'confirmed')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'cancelled')}
                      className="px-3 py-2 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Active Care & Upcoming Jobs */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <span>Active & Confirmed Sessions ({activeBookings.length})</span>
        </h2>

        {activeBookings.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4">No active or upcoming jobs scheduled.</p>
        ) : (
          <div className="space-y-3">
            {activeBookings.map((b) => (
              <div
                key={b._id}
                className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 transition-all"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={b.status} type="booking" />
                    <span className="font-bold text-slate-900 text-sm">{b.parent?.name}</span>
                    <span className="text-xs text-slate-500">({b.parent?.phone})</span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap gap-2">
                    <span className="font-semibold">{b.dateString}</span>
                    <span>•</span>
                    <span>{b.startTime} - {b.endTime} ({b.totalHours} hrs)</span>
                    <span>•</span>
                    <span>Children: {b.childDetails?.map((c) => `${c.name} (${c.age}y)`).join(', ')}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Emergency Contact: <strong>{b.emergencyContact?.name}</strong> ({b.emergencyContact?.phone})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <p className="font-extrabold text-slate-900">${b.totalAmount}</p>
                    <p className="text-[10px] text-slate-500">Payout: ${b.subtotal}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateBookingStatus(b._id, 'in-progress')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Start Care</span>
                      </button>
                    )}

                    {b.status === 'in-progress' && (
                      <button
                        onClick={() => handleUpdateBookingStatus(b._id, 'completed')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete & End Session</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Document Upload & Rates Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Verification Document */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Verification Credentials</h2>
          </div>
          <p className="text-xs text-slate-500">
            Submit your background check, government photo ID, and CPR certificates for administrator approval.
          </p>

          <form onSubmit={handleUploadDoc} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Criminal Background Check">Criminal Background Check</option>
                <option value="Government ID">Government Photo ID</option>
                <option value="CPR & First Aid Certificate">CPR & First Aid Certificate</option>
                <option value="Childcare License">Childcare License / Degree</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                File Name / Reference
              </label>
              <input
                type="text"
                required
                placeholder="e.g. livescan_clearance_2026.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={uploadingDoc}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploadingDoc ? 'Submitting...' : 'Submit Credential for Review'}</span>
            </button>
          </form>

          {/* Submitted docs list */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Submitted Documents:</h4>
            {(!profile?.verificationDocuments || profile.verificationDocuments.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No documents submitted yet.</p>
            ) : (
              profile.verificationDocuments.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{doc.docType}</p>
                    <p className="text-[10px] text-slate-500">{doc.fileName}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      doc.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : doc.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rate, Capacity & 24/7 Setup Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Rates & Schedule Settings</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Hourly Rate ($/hr)
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Overnight Rate ($/hr)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={overnightRate}
                  onChange={(e) => setOvernightRate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Max Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
                <span className="text-[10px] text-slate-400">Children allowed simultaneously</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs font-bold text-indigo-900 select-none">
                <input
                  type="checkbox"
                  checked={is24x7Available}
                  onChange={(e) => setIs24x7Available(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <Moon className="w-4 h-4 text-indigo-600" />
                <span>Open for 24/7 Overnight Shifts & Emergency Calls</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Bio & Experience
              </label>
              <textarea
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Settings & Rates'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
