import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ReviewModal from '../components/ReviewModal';
import {
  Baby,
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Phone,
  Star,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  Moon
} from 'lucide-react';

const ParentDashboard = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useNotification();

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'completed', 'cancelled'

  // Add child modal/form state
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(3);
  const [childAllergies, setChildAllergies] = useState('');
  const [childSpecialNeeds, setChildSpecialNeeds] = useState('');
  const [childNotes, setChildNotes] = useState('');

  // Review modal
  const [selectedCompletedBooking, setSelectedCompletedBooking] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load parent bookings', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAddChild = async (e) => {
    e.preventDefault();
    if (!childName.trim()) {
      addToast('Please enter a child name', 'warning');
      return;
    }

    const currentChildren = user.children || [];
    const newChild = {
      name: childName.trim(),
      age: Number(childAge) || 3,
      allergies: childAllergies ? childAllergies.split(',').map((s) => s.trim()) : [],
      specialNeeds: childSpecialNeeds,
      notes: childNotes
    };

    try {
      const res = await api.put('/auth/profile', {
        children: [...currentChildren, newChild]
      });

      if (res.data.success) {
        updateUser(res.data.user);
        addToast(`Added child profile for ${childName}!`, 'success');
        setChildName('');
        setChildAge(3);
        setChildAllergies('');
        setChildSpecialNeeds('');
        setChildNotes('');
        setShowAddChild(false);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save child profile', 'error');
    }
  };

  const handleRemoveChild = async (childIndex) => {
    if (!window.confirm('Are you sure you want to remove this child profile?')) return;
    const currentChildren = user.children || [];
    const updated = currentChildren.filter((_, idx) => idx !== childIndex);

    try {
      const res = await api.put('/auth/profile', { children: updated });
      if (res.data.success) {
        updateUser(res.data.user);
        addToast('Child profile removed', 'info');
      }
    } catch (err) {
      addToast('Failed to remove child profile', 'error');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const reason = window.prompt('Please enter cancellation reason:');
    if (reason === null) return;

    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by parent'
      });

      if (res.data.success) {
        addToast('Booking cancelled successfully', 'info');
        fetchBookings();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel booking', 'error');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') {
      return ['pending', 'confirmed', 'in-progress'].includes(b.status);
    }
    if (activeTab === 'completed') {
      return b.status === 'completed';
    }
    return b.status === 'cancelled';
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Family Dashboard
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Welcome, {user?.name}
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage your children's profiles, track live childcare sessions, and review completed bookings.
          </p>
        </div>

        <Link
          to="/providers"
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Find 24/7 Childcare</span>
        </Link>
      </div>

      {/* Section 1: Children Profiles */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Baby className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Registered Children Profiles</h2>
          </div>
          <button
            onClick={() => setShowAddChild(!showAddChild)}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Child</span>
          </button>
        </div>

        {/* Add Child Form Dropdown */}
        {showAddChild && (
          <form
            onSubmit={handleAddChild}
            className="p-5 rounded-2xl bg-slate-50 border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-900">
                New Child Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowAddChild(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leo Davis"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Known Allergies (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Dairy, Penicillin"
                  value={childAllergies}
                  onChange={(e) => setChildAllergies(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Special Care Needs / Medications
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inhaler, EpiPen, Glasses"
                  value={childSpecialNeeds}
                  onChange={(e) => setChildSpecialNeeds(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Routine / Bedtime Notes
              </label>
              <textarea
                rows="2"
                placeholder="Favorite story, bedtime snacks, calming habits..."
                value={childNotes}
                onChange={(e) => setChildNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Child Profile
              </button>
            </div>
          </form>
        )}

        {/* List Children */}
        {(!user?.children || user.children.length === 0) ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">
              No child profiles added yet. Add your children to easily select them during booking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.children.map((child, idx) => (
              <div
                key={child._id || idx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all space-y-2 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{child.name}</h4>
                      <p className="text-[10px] text-slate-500">{child.age} years old</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveChild(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    title="Remove Profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Allergies chip */}
                {child.allergies && child.allergies.length > 0 && child.allergies[0] !== 'None' && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      ⚠️ Allergy: {child.allergies.join(', ')}
                    </span>
                  </div>
                )}

                {child.specialNeeds && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-md">
                    {child.specialNeeds}
                  </p>
                )}

                {child.notes && (
                  <p className="text-[11px] text-slate-600 italic line-clamp-2">
                    "{child.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Bookings & Shifts */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Childcare Bookings</h2>
          </div>

          {/* Booking Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Active / Upcoming
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'completed' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'cancelled' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* Bookings List */}
        {loadingBookings ? (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-28 bg-slate-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">
              No {activeTab} childcare bookings found.
            </p>
            {activeTab === 'upcoming' && (
              <Link
                to="/providers"
                className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Browse Available Providers
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => (
              <div
                key={b._id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={b.status} type="booking" />
                    {b.isOvernight && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Moon className="w-3 h-3 text-indigo-600" />
                        24/7 Overnight
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      ID: #{b._id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {b.provider?.name || 'Childcare Specialist'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {b.dateString}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {b.startTime} - {b.endTime} ({b.totalHours} hrs)
                      </span>
                      <span>•</span>
                      <span>
                        Children: {b.childDetails.map((c) => c.name).join(', ')} ({b.numberOfChildren})
                      </span>
                    </div>
                  </div>

                  {b.specialInstructions && (
                    <p className="text-[11px] text-slate-500 italic">
                      Special notes: "{b.specialInstructions}"
                    </p>
                  )}
                </div>

                {/* Right price and actions */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <p className="text-base font-extrabold text-slate-900">${b.totalAmount}</p>
                    <p className="text-[10px] text-slate-500">${b.hourlyRate}/hr + $5 fee</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* If upcoming, can cancel */}
                    {['pending', 'confirmed'].includes(b.status) && (
                      <button
                        onClick={() => handleCancelBooking(b._id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                      >
                        Cancel Booking
                      </button>
                    )}

                    {/* If completed, can leave review */}
                    {b.status === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedCompletedBooking(b);
                          setIsReviewModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Leave Review</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewModal
        booking={selectedCompletedBooking}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSubmitted={() => {
          fetchBookings();
        }}
      />
    </div>
  );
};

export default ParentDashboard;
