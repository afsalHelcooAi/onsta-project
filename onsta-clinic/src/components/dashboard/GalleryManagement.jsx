import React, { useState, useRef } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Image as ImageIcon, Plus, Trash2, Eye, EyeOff, Star, X, Upload } from 'lucide-react';
import { uploadClinicMedia, deleteClinicMedia, patchClinicMedia } from '../../api/clinicProfileApi';

export default function GalleryManagement() {
  const { gallery, setGallery, setClinicData, addGalleryImage, deleteGalleryImage, toggleGalleryImageActive, showToast } = useClinic();
  const token = localStorage.getItem('onsta_access_token');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mohapConfirmed, setMohapConfirmed] = useState(true);
  const [newImage, setNewImage] = useState({
    url: '',
    caption: '',
    category: 'Treatment Room',
    isCover: false
  });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!mohapConfirmed) {
      showToast?.('error', 'Compliance Confirmation Required', 'Please confirm the photo meets MOHAP advertising rules.');
      return;
    }

    if (token && selectedFile) {
      setUploading(true);
      try {
        const uploaded = await uploadClinicMedia(selectedFile, newImage.caption, newImage.category, newImage.isCover, token);
        setGallery(prev => {
          const updated = newImage.isCover ? prev.map(i => ({ ...i, isCover: false })) : prev;
          return [{
            id: uploaded.id,
            url: uploaded.url,
            caption: uploaded.caption,
            category: uploaded.category,
            isActive: uploaded.isActive !== false,
            isCover: uploaded.isCover,
            uploadedAt: new Date().toISOString().split('T')[0]
          }, ...updated];
        });
        if (newImage.isCover) {
          setClinicData(prev => ({ ...prev, coverImage: uploaded.url }));
        }
        showToast?.('success', 'Photo Uploaded', 'Gallery image optimized and published.');
        setIsModalOpen(false);
        setSelectedFile(null);
        setPreviewUrl('');
        setNewImage({ url: '', caption: '', category: 'Treatment Room', isCover: false });
      } catch (err) {
        showToast?.('error', 'Upload Failed', err.message || 'Could not upload photo.');
      } finally {
        setUploading(false);
      }
      return;
    }

    const success = addGalleryImage({
      ...newImage,
      url: previewUrl || newImage.url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80'
    });
    if (success) {
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
    }
  };

  const handleSetAsCover = async (img) => {
    if (token) {
      try {
        await patchClinicMedia(img.id, { is_cover: true }, token);
        setGallery(prev => prev.map(i => ({ ...i, isCover: i.id === img.id })));
        setClinicData(prev => ({ ...prev, coverImage: img.url }));
        showToast?.('success', 'Cover Banner Updated', 'Selected gallery photo is now your clinic cover.');
      } catch (err) {
        showToast?.('error', 'Update Failed', err.message);
      }
    } else {
      setClinicData(prev => ({ ...prev, coverImage: img.url }));
      setGallery(prev => prev.map(i => ({ ...i, isCover: i.id === img.id })));
    }
  };

  const handleToggleActive = async (img) => {
    if (token) {
      try {
        await patchClinicMedia(img.id, { is_active: !img.isActive }, token);
      } catch (err) {
        showToast?.('error', 'Update Failed', err.message);
        return;
      }
    }
    toggleGalleryImageActive(img.id);
  };

  const handleDelete = async (id) => {
    if (token) {
      try {
        await deleteClinicMedia(id, token);
      } catch (err) {
        showToast?.('error', 'Delete Failed', err.message);
        return;
      }
    }
    deleteGalleryImage(id);
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
          className="px-4 py-2 rounded-full bg-theme-primary text-white hover:bg-theme-primary-hover text-xs alata-regular flex items-center gap-1.5 transition-colors shadow-sm self-start"
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
            className="bg-theme-card rounded-2xl border border-theme-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
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
                  onClick={() => handleSetAsCover(img)}
                  className={`px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur transition-colors flex items-center gap-1 ${
                    img.isCover ? 'bg-[#6B3B66] text-white' : 'bg-black/60 text-white/90 hover:bg-black/80'
                  }`}
                  title="Set as clinic cover banner"
                >
                  <Star className={`w-3 h-3 ${img.isCover ? 'fill-amber-300 text-amber-300' : ''}`} />
                  <span>{img.isCover ? 'Cover' : 'Set Cover'}</span>
                </button>
                <button
                  onClick={() => handleToggleActive(img)}
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
                  Uploaded: {img.uploadedAt || (img.createdAt ? img.createdAt.split('T')[0] : 'Recently')}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Verified
                </span>

                <button
                  onClick={() => handleDelete(img.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-theme-overlay/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-theme-card rounded-3xl shadow-xl max-w-md w-full overflow-hidden border border-theme-border animate-scaleUp">
            <div className="p-6 bg-theme-sidebar-bg text-white flex items-center justify-between">
              <h3 className="text-lg alata-regular">Upload Clinic Photo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1.5">
                  Clinic Photo (JPG, PNG, WebP) *
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
                <label className="block text-xs font-semibold text-theme-ink mb-1">
                  Category
                </label>
                <select
                  value={newImage.category}
                  onChange={(e) => setNewImage({ ...newImage, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-theme-border-slate text-xs text-theme-ink bg-theme-surface"
                >
                  <option value="Treatment Room">Treatment Room</option>
                  <option value="Interior">Interior / Reception</option>
                  <option value="Equipment">Medical Equipment</option>
                  <option value="Consultation">Consultation Suite</option>
                  <option value="Team">Clinical Team</option>
                  <option value="Exterior">Exterior</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-ink mb-1">
                  Image Caption *
                </label>
                <input
                  type="text"
                  required
                  value={newImage.caption}
                  onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                  placeholder="e.g. Laser Consultation Room 2"
                  className="w-full px-3 py-2 rounded-xl border border-theme-border-slate bg-theme-surface text-xs text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary"
                />
                <p className="text-[11px] text-theme-muted mt-1">
                  Must follow MOHAP advertising rules (no superlatives).
                </p>
              </div>

              <label className="flex items-start gap-2 text-[11px] text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mohapConfirmed}
                  onChange={(e) => setMohapConfirmed(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>
                  I confirm this photo contains no unconsented patient faces or prohibited promotional text under MOHAP guidelines.
                </span>
              </label>

              <label className="flex items-start gap-2 text-[11px] text-gray-600 bg-amber-50 border border-amber-200 rounded-xl p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mohapConfirmed}
                  onChange={(e) => setMohapConfirmed(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>
                  I confirm this photo contains no unconsented patient faces or prohibited promotional text under MOHAP guidelines.
                </span>
              </label>

              <div className="pt-3 border-t border-theme-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-theme-border-slate text-xs font-medium text-theme-muted hover:bg-theme-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-full bg-theme-primary text-white text-xs alata-regular hover:bg-theme-primary-hover disabled:opacity-50"
                >
                  {uploading ? 'Optimizing & Uploading...' : 'Upload & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
