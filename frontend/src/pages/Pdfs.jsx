import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, FileText, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import api from '../api';

const blank = {
  name: '',
  description: '',
  active: true,
  pdfFile: null,
  imageFile: null,
  pdfUrl: '',
  imageUrl: '',
};

export default function Pdfs() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pdfs');
      setPdfs(data.pdfs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(blank);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name,
      description: p.description || '',
      active: p.active,
      pdfFile: null,
      imageFile: null,
      pdfUrl: p.pdfUrl || '',
      imageUrl: p.imageUrl || '',
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!editingId && !form.pdfFile) {
      alert('Please choose a PDF file');
      return;
    }
    setSaving(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('active', String(form.active));
      if (form.pdfFile) fd.append('pdf', form.pdfFile);
      if (form.imageFile) fd.append('image', form.imageFile);

      const opts = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      };

      if (editingId) {
        await api.put(`/pdfs/${editingId}`, fd, opts);
      } else {
        await api.post('/pdfs', fd, opts);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this PDF? Users will no longer see it in the WhatsApp flow.')) return;
    await api.delete(`/pdfs/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">PDF Resources</h1>
          <p className="text-sm text-gray-600">
            {pdfs.length} resource{pdfs.length === 1 ? '' : 's'} — shown dynamically inside the WhatsApp flow under
            <span className="font-medium"> Choose Service → PDF Resources</span>.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} /> New PDF
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : pdfs.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          <FileText className="mx-auto mb-3 text-gray-300" size={40} />
          No PDFs yet. Click <strong>New PDF</strong> to upload one.
          <p className="text-xs mt-2">
            Until at least one active PDF exists, the <em>PDF Resources</em> tile will be hidden from the WhatsApp flow.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs.map((p) => (
            <div key={p._id} className="card overflow-hidden flex flex-col">
              <div className="aspect-square bg-gray-100 relative">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <FileText size={48} />
                  </div>
                )}
                <span
                  className={`absolute top-2 left-2 pill ${
                    p.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {p.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-semibold text-brand-900 line-clamp-1">{p.name}</div>
                {p.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.description}</p>
                )}
                <a
                  href={p.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline mt-2"
                >
                  <ExternalLink size={12} /> Open PDF
                </a>
                <div className="mt-auto pt-3 flex gap-2">
                  <button onClick={() => openEdit(p)} className="btn-secondary flex-1 !py-1.5">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => remove(p._id)} className="btn-danger !py-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="font-semibold text-brand-800">
                {editingId ? 'Edit PDF' : 'Upload New PDF'}
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Yoga Beginner Guide"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Shown as the title in the flow's PDF list.
                </p>
              </div>
              <div>
                <label className="label">Short description</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 15 page introduction to yoga"
                />
              </div>
              <div>
                <label className="label">PDF file {editingId ? '(leave blank to keep current)' : '*'}</label>
                {form.pdfUrl && !form.pdfFile && (
                  <a
                    href={form.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs text-brand-700 hover:underline mb-1"
                  >
                    Current file ↗
                  </a>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  className="input"
                  onChange={(e) => setForm({ ...form, pdfFile: e.target.files?.[0] || null })}
                />
              </div>
              <div>
                <label className="label">Icon image (shown next to the PDF in the flow)</label>
                {form.imageUrl && !form.imageFile && (
                  <img src={form.imageUrl} alt="" className="w-20 h-20 object-cover rounded-lg mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: square image (1:1). Optional but recommended.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Show this PDF in the WhatsApp flow
              </label>
            </div>

            {saving && progress > 0 && progress < 100 && (
              <div className="px-5 pb-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Uploading… {progress}%</p>
              </div>
            )}
            {saving && progress >= 100 && (
              <div className="px-5 pb-1">
                <p className="text-xs text-gray-500">Processing on server… (saving to Cloudinary)</p>
              </div>
            )}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving
                  ? progress < 100 && progress > 0
                    ? `Uploading ${progress}%`
                    : 'Saving…'
                  : editingId
                  ? 'Update'
                  : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
