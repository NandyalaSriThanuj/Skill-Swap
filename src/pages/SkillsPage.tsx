import React, { useState, useEffect } from 'react';
import { SkillFormModal } from '../components/SkillFormModal';
import type { Profile } from '../types';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles, 
  Code, 
  Palette, 
  Globe, 
  Music, 
  Hammer,
  HelpCircle,
  TrendingUp,
  FolderOpen
} from 'lucide-react';

interface MasterSkill {
  id: string;
  name: string;
  category: string;
}

const DEFAULT_MASTER_SKILLS: MasterSkill[] = [
  { id: 'ms-1', name: 'React', category: 'Programming' },
  { id: 'ms-2', name: 'TypeScript', category: 'Programming' },
  { id: 'ms-3', name: 'Python', category: 'Programming' },
  { id: 'ms-4', name: 'Figma', category: 'Design & UX' },
  { id: 'ms-5', name: 'UI/UX Design', category: 'Design & UX' },
  { id: 'ms-6', name: 'Spanish', category: 'Languages' },
  { id: 'ms-7', name: 'French', category: 'Languages' },
  { id: 'ms-8', name: 'Acoustic Guitar', category: 'Music & Art' },
  { id: 'ms-9', name: 'Woodworking', category: 'Gardening & Crafts' },
  { id: 'ms-10', name: 'Tailwind CSS', category: 'Programming' },
  { id: 'ms-11', name: 'Node.js', category: 'Programming' },
  { id: 'ms-12', name: 'Branding', category: 'Design & UX' },
  { id: 'ms-13', name: 'Cooking', category: 'Gardening & Crafts' },
  { id: 'ms-14', name: 'Machine Learning', category: 'Programming' }
];

export const SkillsPage: React.FC = () => {
  
  const [skills, setSkills] = useState<MasterSkill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Popular Skills State
  const [popularSkills, setPopularSkills] = useState<{ name: string; count: number }[]>([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Add Custom Skill');
  const [editingSkill, setEditingSkill] = useState<MasterSkill | null>(null);

  // Seed master skills catalog in localStorage if needed
  useEffect(() => {
    const loadSkillsAndPopularity = () => {
      let masterSkills = DEFAULT_MASTER_SKILLS;
      
      const stored = localStorage.getItem('skillswap-master-skills');
      if (stored) {
        masterSkills = JSON.parse(stored);
      } else {
        localStorage.setItem('skillswap-master-skills', JSON.stringify(DEFAULT_MASTER_SKILLS));
      }
      setSkills(masterSkills);

      // Calculate popular skills based on users profiles
      const allProfiles: Profile[] = JSON.parse(localStorage.getItem('skillswap-mock-profiles') || '[]');
      const skillCounts: Record<string, number> = {};

      allProfiles.forEach(p => {
        const uniqueSkills = new Set([
          ...(p.skills_teach || []),
          ...(p.skills_learn || [])
        ]);

        uniqueSkills.forEach(s => {
          const sName = s.trim();
          if (sName) {
            skillCounts[sName] = (skillCounts[sName] || 0) + 1;
          }
        });
      });

      const sortedPopular = Object.entries(skillCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setPopularSkills(sortedPopular);
    };

    loadSkillsAndPopularity();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSkill(null);
    setModalTitle('Add Custom Skill');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (skill: MasterSkill) => {
    setEditingSkill(skill);
    setModalTitle('Edit Skill Details');
    setIsModalOpen(true);
  };

  const handleSaveSkill = (name: string, category: string) => {
    let updatedSkills: MasterSkill[];

    if (editingSkill) {
      // Edit mode
      updatedSkills = skills.map(s => 
        s.id === editingSkill.id ? { ...s, name, category } : s
      );
    } else {
      // Add mode
      const newSkill: MasterSkill = {
        id: `ms-${Math.random().toString(36).substr(2, 9)}`,
        name,
        category
      };
      
      // Prevent duplicates
      if (skills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        alert('Skill already exists in the catalog!');
        return;
      }
      
      updatedSkills = [...skills, newSkill];
    }

    setSkills(updatedSkills);
    localStorage.setItem('skillswap-master-skills', JSON.stringify(updatedSkills));
  };

  const handleDeleteSkill = (skillId: string) => {
    if (confirm('Are you sure you want to delete this skill from the master catalog?')) {
      const updatedSkills = skills.filter(s => s.id !== skillId);
      setSkills(updatedSkills);
      localStorage.setItem('skillswap-master-skills', JSON.stringify(updatedSkills));
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Programming':
        return <Code className="w-4 h-4 text-blue-500" />;
      case 'Design & UX':
        return <Palette className="w-4 h-4 text-purple-500" />;
      case 'Languages':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'Music & Art':
        return <Music className="w-4 h-4 text-pink-500" />;
      default:
        return <Hammer className="w-4 h-4 text-amber-500" />;
    }
  };

  const categories = ['All', 'Programming', 'Design & UX', 'Languages', 'Music & Art', 'Gardening & Crafts'];

  const filteredSkills = skills.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-colors duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading font-extrabold text-3xl tracking-tight text-gray-900 dark:text-white flex items-center">
            <FolderOpen className="w-8 h-8 mr-2 text-primary-500" />
            Skill Registry Catalog
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Browse, search, and manage the master database of skills for barter exchanges.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn-primary self-start sm:self-auto flex items-center space-x-1.5 px-4.5 py-2.5 shadow-primary-500/10 cursor-pointer"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Register Skill</span>
        </button>
      </div>

      {/* Grid: Search/List and Popular Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left/Middle: Skill Browsing/Filters (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search registered skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/15 focus:border-primary-500 transition-all dark:text-white"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/10'
                      : 'bg-white dark:bg-slate-900 text-gray-650 dark:text-slate-300 border-gray-150 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Master Skill Grid List */}
          {filteredSkills.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredSkills.map(skill => (
                <div 
                  key={skill.id}
                  className="bg-surface border border-border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-xl shrink-0">
                      {getCategoryIcon(skill.category)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {skill.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                        {skill.category}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(skill)}
                      className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors"
                      title="Edit Skill"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      title="Delete Skill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-premium p-12 text-center space-y-4 max-w-sm mx-auto">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
              <div>
                <h3 className="font-bold text-base text-gray-800 dark:text-white">No skills registered</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Try checking your search criteria or register a new skill to the platform.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Popular Skills & Categories (1/3) */}
        <div className="space-y-6">
          
          {/* Popular Skills list */}
          <div className="card-premium p-6 space-y-4">
            <h3 className="font-heading font-extrabold text-base text-gray-905 dark:text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary-500" />
              Most Demanded Skills
            </h3>
            
            <div className="divide-y divide-gray-50 dark:divide-slate-800 space-y-3">
              {popularSkills.length > 0 ? (
                popularSkills.map((pop, idx) => (
                  <div key={pop.name} className={`pt-3 ${idx === 0 ? 'pt-0' : ''} flex items-center justify-between`}>
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-350">
                      {pop.name}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100/30">
                      {pop.count} {pop.count === 1 ? 'Swapper' : 'Swappers'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 dark:text-slate-500 italic pt-2">No swap statistics compiled yet.</p>
              )}
            </div>
          </div>
          
          {/* Quick instructions / Info panel */}
          <div className="p-5 bg-gradient-to-r from-primary-500/5 to-secondary-500/5 border border-primary-500/10 rounded-3xl flex items-start space-x-3 text-xs text-gray-650 dark:text-slate-450 leading-relaxed">
            <Sparkles className="w-5 h-5 text-primary-500 shrink-0 mt-0.5 animate-pulse-slow" />
            <div>
              <span className="font-bold text-gray-800 dark:text-slate-300">Catalog Registry Rules</span>
              <p className="mt-1">
                Adding skills to the master catalog allows them to appear as options under profiles and search categories. Make sure custom additions match spelling patterns.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Add / Edit Skill Modal */}
      <SkillFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveSkill}
        initialName={editingSkill?.name || ''}
        initialCategory={editingSkill?.category || 'Programming'}
        title={modalTitle}
      />
    </div>
  );
};
export default SkillsPage;
