import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Repeat, 
  BookOpen, 
  Sparkles, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Code,
  Palette,
  MessageSquare
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: BookOpen,
      title: "Teach and Learn",
      description: "Exchange your expertise for something you want to learn. No currency, just community and knowledge sharing."
    },
    {
      icon: Users,
      title: "Direct Peer Connections",
      description: "Match directly with users who have what you want and need what you have. Chat and schedule your learning sessions."
    },
    {
      icon: Sparkles,
      title: "Completely Free",
      description: "Unlock your potential through barter. The only fee is your time, enthusiasm, and willingness to share."
    }
  ];

  const categories = [
    { name: "Programming", icon: Code, count: "42 Skills", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { name: "Design & UX", icon: Palette, count: "28 Skills", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { name: "Languages", icon: Users, count: "15 Skills", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
    { name: "Music & Art", icon: Sparkles, count: "21 Skills", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" }
  ];

  return (
    <div className="relative overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl -z-10 animate-float"></div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:text-left lg:flex lg:items-center lg:space-x-12">
        <div className="flex-1 space-y-6 lg:max-w-xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Modern Skill Bartering</span>
          </div>
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-gray-900 dark:text-white leading-[1.1]">
            Learn anything, by teaching what{' '}
            <span className="bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              you know.
            </span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-300 max-w-lg mx-auto lg:mx-0">
            SkillSwap is a community for curious minds. Exchange programming, design, language, music, or gardening skills with peers—completely free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl hover:shadow-lg hover:shadow-primary-500/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>{user ? "Go to Dashboard" : "Start Swapping"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/browse"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 text-base font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>Browse Skills</span>
            </Link>
          </div>
          
          <div className="pt-6 flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-gray-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>No fees</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Verified members</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>1-on-1 swaps</span>
            </div>
          </div>
        </div>

        {/* Hero Image/Card Panel */}
        <div id="how-it-works" className="flex-1 mt-12 lg:mt-0 max-w-md mx-auto lg:max-w-none scroll-mt-24">
          <div className="relative bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-8 rounded-3xl shadow-xl space-y-6">
            {/* Top Swapper Showcase */}
            <div className="absolute -top-6 -right-6 p-4 bg-gradient-to-r from-secondary-500 to-primary-500 rounded-2xl shadow-lg text-white text-xs font-bold flex items-center space-x-2 animate-bounce-slow">
              <Repeat className="w-4 h-4 animate-spin-slow" />
              <span>100% Barter Model</span>
            </div>

            <h3 className="font-heading font-extrabold text-xl text-gray-800 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
              How a Swap Works
            </h3>

            {/* Step 1 */}
            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200">1. Find a Partner</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Search profiles. E.g., Marcus can teach <strong>Figma</strong> and wants to learn <strong>React</strong>.
                </p>
              </div>
            </div>

            {/* Arrow connector */}
            <div className="w-0.5 h-6 bg-gray-200 dark:bg-slate-800 ml-5"></div>

            {/* Step 2 */}
            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-secondary-100 dark:bg-secondary-950/40 text-secondary-600 dark:text-secondary-400 rounded-xl">
                <Repeat className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200">2. Request Exchange</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Send a swap proposal. Marcus teaches you Figma, you teach Marcus React.
                </p>
              </div>
            </div>

            {/* Arrow connector */}
            <div className="w-0.5 h-6 bg-gray-200 dark:bg-slate-800 ml-5"></div>

            {/* Step 3 */}
            <div className="flex items-start space-x-4">
              <div className="p-2.5 bg-accent-500/10 text-accent-500 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-800 dark:text-slate-200">3. Connect & Learn</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Approve proposals, join chat, and arrange video lessons.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-gray-100 dark:border-slate-900 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="font-heading font-extrabold text-3xl text-gray-900 dark:text-white">
            Designed for collaboration
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            A network of creators, engineers, and teachers helping each other grow, one session at a time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 p-6 rounded-2xl hover:shadow-md hover:border-primary-500/10 transition-all duration-350"
              >
                <div className="p-3 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-xl inline-block mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Browse Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-gray-100 dark:border-slate-900 bg-gray-50/50 dark:bg-slate-900/10">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <h2 className="font-heading font-extrabold text-3xl text-gray-900 dark:text-white">
            Explore Categories
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            Discover a wide range of categories. There is always something new to learn.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category, idx) => {
            const Icon = category.icon;
            return (
              <Link
                key={idx}
                to={`/browse?category=${encodeURIComponent(category.name)}`}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl hover:shadow-lg hover:border-secondary-500/20 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center space-y-3"
              >
                <div className={`p-4 rounded-full ${category.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-850 dark:text-white text-base">{category.name}</h4>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{category.count}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Call To Action */}
      <section id="about-us" className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-3xl max-w-7xl mx-4 sm:mx-6 lg:mx-auto px-8 py-16 text-center relative overflow-hidden shadow-xl mb-24 scroll-mt-20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -z-1"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-2xl -z-1"></div>

        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white">
            Ready to exchange your knowledge?
          </h2>
          <p className="text-primary-100 max-w-md mx-auto text-sm sm:text-base">
            Create your profile, post your skills, and see who you can match with today.
          </p>
          <div className="pt-4">
            <Link
              to={user ? "/dashboard" : "/auth"}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-600 font-bold rounded-xl shadow-lg hover:bg-gray-50 hover:shadow-white/10 hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>{user ? "Open Dashboard" : "Sign Up Free"}</span>
              <ArrowRight className="w-4.5 h-4.5 text-primary-600" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
export default LandingPage;
