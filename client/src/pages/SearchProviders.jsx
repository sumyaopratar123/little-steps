import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProviderCard from '../components/ProviderCard';
import BookingModal from '../components/BookingModal';
import {
  Search,
  Filter,
  Moon,
  Star,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  Baby
} from 'lucide-react';

const SERVICES_LIST = [
  'All Services',
  'Infant Care (0-1 yr)',
  'Toddler Care (1-3 yrs)',
  'Preschool Care (3-5 yrs)',
  'Overnight / 24x7 Care',
  'After-School Care',
  'Special Needs Support',
  'Weekend Care',
  'Emergency Drop-in'
];

const SearchProviders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [is24x7, setIs24x7] = useState(searchParams.get('is24x7') === 'true');
  const [service, setService] = useState(searchParams.get('service') || 'All Services');
  const [maxRate, setMaxRate] = useState(searchParams.get('maxRate') || 100);
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || 0);

  // Booking Modal
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (is24x7) params.set('is24x7', 'true');
      if (service && service !== 'All Services') params.set('service', service);
      if (maxRate < 100) params.set('maxRate', maxRate);
      if (minRating > 0) params.set('minRating', minRating);
      params.set('allStatus', 'false'); // verified only

      const res = await api.get(`/providers?${params.toString()}`);
      if (res.data.success) {
        setProviders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load providers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [is24x7, service, maxRate, minRating]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProviders();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCity('');
    setIs24x7(false);
    setService('All Services');
    setMaxRate(100);
    setMinRating(0);
    setSearchParams({});
  };

  const handleBookNow = (provider) => {
    setSelectedProvider(provider);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Find Trusted Childcare Providers
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Explore background-checked caregivers available for daytime care, after-school supervision, and 24/7 overnight shifts.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        {/* Search bar & City */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by provider name, specialty, certifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="City (e.g. San Francisco)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-colors shrink-0"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Detailed Filters Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Service dropdown */}
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              {SERVICES_LIST.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>

            {/* 24x7 Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 select-none bg-indigo-50/60 hover:bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 transition-colors">
              <input
                type="checkbox"
                checked={is24x7}
                onChange={(e) => setIs24x7(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span>24/7 Overnight Only</span>
            </label>

            {/* Min Rating */}
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="0">Any Star Rating</option>
              <option value="4.5">★ 4.5 & up</option>
              <option value="4.8">★ 4.8 & up</option>
              <option value="4.9">★ 4.9 & up</option>
            </select>

            {/* Max Hourly Rate slider */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span>Max:</span>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={maxRate}
                onChange={(e) => setMaxRate(Number(e.target.value))}
                className="w-20 accent-indigo-600"
              />
              <span className="font-bold text-slate-900">${maxRate}/hr</span>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong className="text-slate-800">{providers.length}</strong> background-verified caregiver{providers.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 bg-slate-100 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Baby className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">No Providers Found</h3>
            <p className="text-slate-500 text-xs mt-1">
              No verified caregivers matched your filter criteria. Try expanding your search or resetting filters.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((profile) => (
            <ProviderCard key={profile._id} profile={profile} onBookNow={handleBookNow} />
          ))}
        </div>
      )}

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

export default SearchProviders;
