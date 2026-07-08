import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { qualificationService } from '../lib/qualificationService';
import { certificateService } from '../lib/certificateService';
import type { QualificationSession } from '../types';
import { Award, Download, Calendar, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const CertificatesPage: React.FC = () => {
  const { profile } = useAuth();
  const [passedSessions, setPassedSessions] = useState<QualificationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      qualificationService.getUserSessions(profile.id).then((sessions) => {
        setPassedSessions(sessions.filter(s => s.status === 'passed'));
        setLoading(false);
      }).catch((err) => {
        console.error("Failed to fetch sessions for certificates:", err);
        setLoading(false);
      });
    }
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-8 h-8 text-primary-500" />
            My Certificates
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            View and download your earned SkillSwap Mentor Certificates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : passedSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {passedSessions.map((session) => (
            <div key={session.id} className="card-premium p-6 flex flex-col justify-between space-y-6 group hover:scale-[1.02] transition-transform duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                    {session.skill_name}
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 mt-1">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/50">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span>{session.badge || 'Verified Mentor'}</span>
                </div>
                <p className="text-xs font-bold text-gray-600 dark:text-slate-350 bg-gray-50 dark:bg-slate-800 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700/50">
                  Overall Score: {session.score}%
                </p>
              </div>
              
              <button
                onClick={() => certificateService.generateCertificatePDF(profile, session)}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-primary-600 dark:hover:bg-primary-500 text-white text-sm font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-premium p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <Award className="w-8 h-8 text-gray-300 dark:text-slate-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Certificates Yet</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
              You haven't earned any certificates yet. Complete a qualification assessment to become a verified mentor!
            </p>
          </div>
          <Link
            to="/browse"
            className="mt-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl transition-colors inline-flex items-center space-x-2"
          >
            <span>Browse Skills to Assess</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default CertificatesPage;
