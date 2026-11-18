import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Image as ImageIcon, Plus, Trash2, Eye, EyeOff, CheckCircle2, X, Sparkles, Upload } from 'lucide-react';

export default function GalleryManagement() {
  const { gallery, addGalleryImage, deleteGalleryImage, toggleGalleryImageActive } = useClinic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newImage, setNewImage] = useState({
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    caption: 'Private Dermatology Treatment Room with Laser Consoles',
    category: 'Treatment Room'
  });

  const handleAdd = (e) => {
    e.preventDefault();
    const success = addGalleryImage(newImage);
    if (success) {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
            Gallery Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Display your clinical suites, patient lounge, and consultation rooms. Caption claims are verified automatically.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#0d281e] text-white hover:bg-[#153f2f] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Image</span>
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {gallery.map((img) => (
          <div
            key={img.id}
            className="bg-white rounded-2xl border border-[#e7e1d7] overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="relative h-48 bg-gray-100 group">
              <img
                src={img.url}
                alt={img.caption}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur">
                  {img.category}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  onClick={() => toggleGalleryImageActive(img.id)}
                  className={`p-1.5 rounded-full backdrop-blur transition-colors ${
                    img.isActive ? 'bg-white text-emerald-800' : 'bg-black/60 text-white/70'
                  }`}
                  title={img.isActive ? 'Visible to patients' : 'Hidden from patients'}
                >
                  {img.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                  {img.caption}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Uploaded: {img.uploadedAt}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Verified
                </span>

                <button
                  onClick={() => deleteGalleryImage(img.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-[#e7e1d7] animate-scaleUp">
            <div className="p-6 bg-[#0d281e] text-white flex items-center justify-between">
              <h3 className="text-lg font-bold font-serif">Upload Clinic Photo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Image URL / Preset
                </label>
                <input
                  type="text"
                  required
                  value={newImage.url}
                  onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newImage.category}
                  onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 bg-white"
                >
                  <option value="Treatment Room">Treatment Room</option>
                  <option value="Interior">Interior</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Sterilization">Sterilization</option>
                  <option value="Exterior">Exterior</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Image Caption
                </label>
                <input
                  type="text"
                  required
                  value={newImage.caption}
                  onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                  placeholder="e.g. Laser Consultation Room 2"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0d281e]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must follow advertising rules (no superlatives).
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0d281e] text-white text-xs font-semibold hover:bg-[#153f2f]"
                >
                  Upload & Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
