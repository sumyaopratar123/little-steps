import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProviderCard from '../components/ProviderCard';
import BookingModal from '../components/BookingModal';
import {
  ShieldCheck,
  Moon,
  Clock,
  Heart,
  Baby,
  Sparkles,
  ChevronRight,
  Search,
  CheckCircle2,
  Users,
  Award
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [is24x7Only, setIs24x7Only] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/providers?allStatus=false');
        if (res.data.success) {
          setFeaturedProviders(res.data.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load featured providers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    if (is24x7Only) params.set('is24x7', 'true');
    navigate(`/providers?${params.toString()}`);
  };

  const handleBookNow = (provider) => {
    setSelectedProvider(provider);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-indigo-50/60 via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-800 text-xs font-bold border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Available 24 Hours a Day • 7 Days a Week</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Trusted Childcare When Families <span className="text-indigo-600">Need It Most.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Connect with rigorously background-checked nurses, educators, and vetted caregivers for flexible daytime schedules, late evening shifts, and full overnight 24/7 care.
            </p>

            {/* Quick Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white p-3 sm:p-4 rounded-3xl shadow-xl border border-slate-200/80 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="flex-1 flex items-center gap-2.5 px-3 w-full">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter city or neighborhood (e.g. San Francisco)"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-slate-200 w-full sm:w-auto py-2 sm:py-0">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={is24x7Only}
                    onChange={(e) => setIs24x7Only(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>24/7 Care</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all hover:shadow shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>Find Care</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            {/* Key Trust Signals */}
            <div className="pt-4 flex flex-wrap justify-center items-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                100% Identity & FBI-Cleared
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                Strict Capacity Limits
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Pediatric CPR Certified
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Safety Built Into Every Little Step
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            We hold our caregivers to the highest standards in pediatric safety, background verification, and child-to-caregiver ratios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Triple-Layer Vetting</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Every provider must undergo government ID verification, comprehensive criminal background checks, and license verification before receiving their Little Steps badge.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Moon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">24/7 & Overnight Coverage</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Healthcare professionals, flight crews, and late-shift workers rely on our 24/7 certified specialists for dependable overnight childcare in a soothing environment.
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Enforced Capacity Limits</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              No overcrowding, ever. Our scheduling engine locks booking slots the moment a provider hits their maximum child capacity (1-3 children max), guaranteeing individual attention.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Providers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Caregivers Near You</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Featured Verified Providers
            </h2>
          </div>
          <Link
            to="/providers"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            <span>View All Providers</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 bg-slate-100 rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProviders.map((profile) => (
              <ProviderCard key={profile._id} profile={profile} onBookNow={handleBookNow} />
            ))}
          </div>
        )}
      </section>

      {/* Booking Modal */}
      <BookingModal
        provider={selectedProvider}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingCreated={() => {
          navigate('/parent/dashboard');
        }}
      />
    </div>
  );
};

export default Home;
