import React from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  ShieldCheck,
  Clock,
  Users,
  MapPin,
  Award,
  ChevronRight,
  Moon
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const ProviderCard = ({ profile, onBookNow }) => {
  const user = profile.user || {};
  const isVerified = profile.verificationStatus === 'verified';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Top header banner */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-100 shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'P'}
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                    {user.name}
                  </h3>
                  {isVerified && (
                    <span title="Verified by Little Steps Safety Team">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {profile.city || 'San Francisco'}
                  </span>
                  <span>•</span>
                  <span>{profile.experienceYears || 3} yrs exp</span>
                </div>
              </div>
            </div>

            {/* Rating pill */}
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-amber-900 font-bold text-xs shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{profile.rating ? profile.rating.toFixed(1) : '5.0'}</span>
              <span className="text-amber-600 font-normal">({profile.reviewCount || 0})</span>
            </div>
          </div>

          {/* Badges row: 24/7, Max Capacity, Verified */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <StatusBadge status={profile.verificationStatus} type="verification" />

            {profile.is24x7Available && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                24/7 Overnight Ready
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Max {profile.maxCapacity || 3} children
            </span>
          </div>

          {/* Bio snippet */}
          <p className="text-slate-600 text-xs mt-3 line-clamp-2 leading-relaxed">
            {profile.bio}
          </p>

          {/* Services tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(profile.services || []).slice(0, 3).map((service, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md"
              >
                {service}
              </span>
            ))}
            {(profile.services || []).length > 3 && (
              <span className="text-[11px] font-medium text-slate-500 px-1 py-0.5">
                +{profile.services.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card bottom: Rates & Actions */}
      <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-slate-900">${profile.hourlyRate}</span>
            <span className="text-xs text-slate-500">/hr</span>
          </div>
          {profile.overnightRate && (
            <p className="text-[10px] text-slate-500 font-medium">
              Overnight: ${profile.overnightRate}/hr
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/providers/${profile._id}`}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-200/60 transition-colors"
          >
            Details
          </Link>

          <button
            onClick={() => onBookNow && onBookNow(profile)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-1 hover:shadow"
          >
            <span>Book Now</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
