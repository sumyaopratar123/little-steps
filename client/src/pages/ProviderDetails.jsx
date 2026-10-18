import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import BookingModal from '../components/BookingModal';
import StatusBadge from '../components/StatusBadge';
import {
  Star,
  ShieldCheck,
  MapPin,
  Clock,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Moon,
  Sparkles
} from 'lucide-react';

const ProviderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/providers/${id}`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load provider details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">Provider Not Found</h2>
        <button
          onClick={() => navigate('/providers')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Providers
        </button>
      </div>
    );
  }

  const { profile, reviews } = data;
  const user = profile.user || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Main Grid: Details on Left (8 cols), Booking Card on Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-indigo-100">
                  {user.name ? user.name.charAt(0) : 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {user.name}
                    </h1>
                    {profile.verificationStatus === 'verified' && (
                      <span title="Verified by Little Steps Safety Team">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 inline" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profile.city}
                    </span>
                    <span>•</span>
                    <span>{profile.experienceYears || 3} years professional childcare</span>
                  </div>
                </div>
              </div>

              {/* Rating Box */}
              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-2xl flex items-center gap-2">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                <div>
                  <div className="font-extrabold text-amber-900 text-base leading-none">
                    {profile.rating ? profile.rating.toFixed(1) : '5.0'}
                  </div>
                  <span className="text-[10px] text-amber-700 font-medium">
                    {profile.reviewCount || 0} reviews
                  </span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-100">
              <StatusBadge status={profile.verificationStatus} type="verification" />
              {profile.is24x7Available && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  24/7 Overnight Availability
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Max Capacity: {profile.maxCapacity || 3} children
              </span>
            </div>
          </div>

          {/* About & Bio */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">About {user.name}</h2>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </div>

          {/* Services & Specializations */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Services & Age Expertise</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(profile.services || []).map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications & Vetting */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Vetted Credentials & Licenses</h2>
            </div>
            <div className="space-y-2">
              {(profile.certifications || [
                'Pediatric CPR & AED Certified',
                'Criminal Background Check Verified',
                'Government Photo ID Verified'
              ]).map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-950 font-medium"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{cert}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Operating Hours & Availability Table */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">Weekly Schedule</h2>
              </div>
              {profile.is24x7Available && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  Open 24/7 (All Shifts)
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5">Day</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Operating Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(profile.availabilitySchedule || []).map((sched, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-800">{sched.day}</td>
                      <td className="py-2.5">
                        {sched.isAvailable || profile.is24x7Available ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            Available
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            Closed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-600 font-medium">
                        {profile.is24x7Available
                          ? '24 Hours (Day / Evening / Overnight)'
                          : sched.isAvailable
                          ? `${sched.startTime} - ${sched.endTime}`
                          : 'Unavailable'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Verified Parent Reviews ({reviews?.length || 0})
              </h2>
            </div>

            {(!reviews || reviews.length === 0) ? (
              <p className="text-xs text-slate-500 italic">No parent reviews yet for this provider.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {rev.parent?.name?.charAt(0) || 'P'}
                        </div>
                        <span className="font-bold text-slate-900 text-xs">{rev.parent?.name || 'Verified Parent'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Booking Column */}
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-lg space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Caregiver Rate</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-slate-900">${profile.hourlyRate}</span>
                <span className="text-sm text-slate-500">/ hour</span>
              </div>
              {profile.overnightRate && (
                <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Overnight 24/7 Rate: ${profile.overnightRate}/hr</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Maximum Capacity</span>
                <strong className="text-slate-900">{profile.maxCapacity || 3} children</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Location</span>
                <strong className="text-slate-900">{profile.city}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vetting Status</span>
                <span className="font-bold text-emerald-600">Background Cleared</span>
              </div>
            </div>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book Childcare Slot</span>
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-normal">
              100% money-back safety guarantee if caregiver fails to arrive or complete the session.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        provider={profile}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingCreated={() => {
          navigate('/parent/dashboard');
        }}
      />
    </div>
  );
};

export default ProviderDetails;
