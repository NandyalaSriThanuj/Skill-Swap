import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, category: string) => void;
  initialName?: string;
  initialCategory?: string;
  title: string;
}

export const SkillFormModal: React.FC<SkillFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName = '',
  initialCategory = 'Programming',
  title
}) => {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [error, setError] = useState<string | null>(null);

  const categories = ['Programming', 'Design & UX', 'Languages', 'Music & Art', 'Gardening & Crafts'];

  useEffect(() => {
    setName(initialName);
    setCategory(initialCategory);
    setError(null);
  }, [initialName, initialCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Skill name is required.');
      return;
    }
    onSubmit(name.trim(), category);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-450 hover:text-gray-900 dark:hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <h2 className="font-heading font-extrabold text-xl text-gray-900 dark:text-white flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary-500" />
            {title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Register or update a skill in the master repository.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Skill Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Skill Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g., Webflow, Docker, Mandarin..."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
            />
          </div>

          {/* Skill Category */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-white text-sm font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-semibold rounded-xl hover:shadow-lg cursor-pointer"
            >
              Save Skill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SkillFormModal;
