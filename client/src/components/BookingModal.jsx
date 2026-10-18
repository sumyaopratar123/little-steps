import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import {
  X,
  Calendar,
  Clock,
  Baby,
  ShieldCheck,
  Moon,
  AlertCircle,
  Phone,
  Sparkles
} from 'lucide-react';

const BookingModal = ({ provider, isOpen, onClose, onBookingCreated }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [dateString, setDateString] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [isOvernight, setIsOvernight] = useState(false);
  const [selectedChildIndices, setSelectedChildIndices] = useState([0]);
  const [customChildName, setCustomChildName] = useState('');
  const [customChildAge, setCustomChildAge] = useState(3);
  const [customChildAllergies, setCustomChildAllergies] = useState('');
  const [customChildSpecialNeeds, setCustomChildSpecialNeeds] = useState('');
  const [emergencyName, setEmergencyName] = useState(user?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.phone || '+1 (555) 987-6543');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user?.name && !emergencyName) setEmergencyName(user.name);
    if (user?.phone && (!emergencyPhone || emergencyPhone === '+1 (555) 987-6543')) {
      setEmergencyPhone(user.phone);
    }
  }, [user]);

  if (!isOpen || !provider) return null;

  const providerUser = provider.user || {};
  const hourlyRate = provider.hourlyRate || 25;
  const overnightRate = provider.overnightRate || 30;
  const maxCapacity = provider.maxCapacity || 3;

  // Compute duration & total price
  const calcMins = (t) => {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return h * 60 + m;
  };

  const startMins = calcMins(startTime);
  let endMins = calcMins(endTime);
  if (isOvernight && endMins <= startMins) {
    endMins += 24 * 60;
  }
  const diffMins = Math.max(0, endMins - startMins);
  const totalHours = Math.round((diffMins / 60) * 10) / 10;

  // Selected children list
  let activeChildren = [];
  if (user?.children && user.children.length > 0) {
    activeChildren = selectedChildIndices
      .map((idx) => user.children[idx])
      .filter(Boolean)
      .map((c) => ({
        name: c.name,
        age: c.age,
        allergies: c.allergies || [],
        specialNeeds: c.specialNeeds || ''
      }));
  } else if (customChildName) {
    activeChildren = [
      {
        name: customChildName,
        age: Number(customChildAge) || 3,
        allergies: customChildAllergies ? customChildAllergies.split(',').map((s) => s.trim()) : [],
        specialNeeds: customChildSpecialNeeds
      }
    ];
  }

  const childCount = Math.max(1, activeChildren.length);
  const currentRate = isOvernight ? overnightRate : hourlyRate;
  const subtotal = Math.round(currentRate * totalHours * childCount);
  const platformFee = 5;
  const totalAmount = subtotal + platformFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      addToast('Please login as a Parent to book a childcare session', 'warning');
      navigate('/login');
      return;
    }

    if (user.role !== 'parent') {
      setErrorMessage(`Your current role is "${user.role}". Only parents can book childcare.`);
      return;
    }

    if (activeChildren.length === 0) {
      setErrorMessage('Please select or add at least one child profile.');
      return;
    }

    if (!isOvernight && endMins <= startMins) {
      setErrorMessage('End time must be after start time for same-day care. Or enable Overnight Care.');
      return;
    }

    if (activeChildren.length > maxCapacity) {
      setErrorMessage(`Provider can accept at most ${maxCapacity} children at once.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        providerId: providerUser._id || provider._id,
        dateString,
        startTime,
        endTime,
        isOvernight,
        childDetails: activeChildren,
        emergencyContact: {
          name: emergencyName || user.name,
          phone: emergencyPhone || '+1 (555) 000-0000',
          relation: 'Parent / Primary Guardian'
        },
        specialInstructions
      });

      if (res.data.success) {
        addToast('Booking request submitted! Provider will confirm shortly.', 'success');
        if (onBookingCreated) onBookingCreated(res.data.data);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit booking';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl">
              {providerUser.name ? providerUser.name.charAt(0) : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Book Childcare</h2>
                {provider.verificationStatus === 'verified' && (
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                )}
              </div>
              <p className="text-indigo-100 text-xs mt-0.5">
                with {providerUser.name} • {provider.city} (Max {maxCapacity} children)
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Booking Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Child Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Child(ren)
            </label>
            {user?.children && user.children.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {user.children.map((child, idx) => {
                  const isChecked = selectedChildIndices.includes(idx);
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        if (isChecked) {
                          if (selectedChildIndices.length > 1) {
                            setSelectedChildIndices(selectedChildIndices.filter((i) => i !== idx));
                          }
                        } else {
                          setSelectedChildIndices([...selectedChildIndices, idx]);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Baby className={`w-4 h-4 ${isChecked ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div>
                        <p className="text-xs font-bold leading-tight">{child.name}</p>
                        <p className="text-[10px] text-slate-500">{child.age} yrs old</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Child Name (e.g. Leo)"
                      value={customChildName}
                      onChange={(e) => setCustomChildName(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Age"
                      value={customChildAge}
                      onChange={(e) => setCustomChildAge(e.target.value)}
                      min="0"
                      max="18"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Allergies (e.g. Peanuts, Gluten) or None"
                  value={customChildAllergies}
                  onChange={(e) => setCustomChildAllergies(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            )}
          </div>

          {/* Date & Overnight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Booking Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={dateString}
                  onChange={(e) => setDateString(e.target.value)}
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none bg-indigo-50/60 hover:bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 w-full transition-colors">
                <input
                  type="checkbox"
                  checked={isOvernight}
                  onChange={(e) => setIsOvernight(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>24/7 Overnight Stay</span>
              </label>
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Start Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                End Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Emergency Phone
              </label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                required
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Care Instructions & Allergies
            </label>
            <textarea
              rows="2"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Bedtime routine, favorite toys, dietary restrictions, medication schedule..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            ></textarea>
          </div>

          {/* Pricing Summary Box */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>
                Rate (${currentRate}/hr × {totalHours} hrs × {childCount} child)
              </span>
              <span>${subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Trust & Safety Platform Fee</span>
              <span>${platformFee}</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-sm text-slate-900">
              <span>Total Guaranteed Amount</span>
              <span className="text-indigo-600">${totalAmount}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span>Checking Slots...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Confirm & Book (${totalAmount})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
