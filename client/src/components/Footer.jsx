import React from 'react';
import { Baby, Shield, PhoneCall, Heart, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Emergency line */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                <Baby className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">Little Steps</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Trusted 24×7 childcare platform connecting background-checked caregivers with families for flexible daytime, evening, and overnight care.
            </p>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">24/7 Family Dispatch Helpline</p>
                <p className="text-sm font-extrabold text-white">1-800-STEPS-24</p>
              </div>
            </div>
          </div>

          {/* Col 2: For Parents */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">For Parents</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link to="/providers" className="hover:text-white transition-colors">Find 24/7 Childcare</Link></li>
              <li><Link to="/providers?is24x7=true" className="hover:text-white transition-colors">Overnight Care Providers</Link></li>
              <li><Link to="/providers?service=Infant+Care+(0-1+yr)" className="hover:text-white transition-colors">Infant & Newborn Specialists</Link></li>
              <li><Link to="/parent/dashboard" className="hover:text-white transition-colors">Parent Booking Portal</Link></li>
            </ul>
          </div>

          {/* Col 3: For Providers */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">For Providers</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link to="/register?role=provider" className="hover:text-white transition-colors">Apply as a Caregiver</Link></li>
              <li><Link to="/provider/dashboard" className="hover:text-white transition-colors">Provider Dashboard</Link></li>
              <li><span className="text-slate-400">Background Check Protocol</span></li>
              <li><span className="text-slate-400">Safety & Insurance Standards</span></li>
            </ul>
          </div>

          {/* Col 4: Trust & Verification Guarantee */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Trust & Safety Guarantee</h4>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>100% Criminal Background Checked & Identity Verified</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Round-the-clock emergency support & check-ins</span>
              </li>
              <li className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>CPR & First Aid certified pediatric professionals</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Little Steps Platform Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Child Safety Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
