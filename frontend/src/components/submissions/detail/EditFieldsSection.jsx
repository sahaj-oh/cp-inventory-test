/**
 * Edit unit details — self-contained "✏ Edit" trigger + changed-only save.
 * Ported from CP DetailPanel.jsx (EDITABLE_FIELDS + startEdit/saveEdit).
 * Society & CP identity are not editable here.
 *
 * Gated on ADMIN only: the save endpoint PATCH /api/admin/submissions/<id> is
 * `@require_admin_role`, so a non-admin who reached this form would only get a
 * 403 on Save. Showing it only to admins avoids that dead-end (per the brief).
 */
import { useState } from 'react';
import { api } from '../../../api';
import { getUser } from '../../../auth';

const EDITABLE_FIELDS = [
  { key: 'tower',               label: 'Tower',            type: 'text'   },
  { key: 'unit_no',              label: 'Unit No',          type: 'text'   },
  { key: 'floor',                label: 'Floor',            type: 'text'   },
  { key: 'sqft',                 label: 'Area (sqft)',      type: 'number' },
  { key: 'bhk',                  label: 'BHK',              type: 'number' },
  { key: 'occupancy_status',     label: 'Occupancy',        type: 'text'   },
  { key: 'asking_price',         label: 'Asking price (₹)', type: 'number' },
  { key: 'seller_name',          label: 'Seller name',      type: 'text'   },
  { key: 'seller_phone',         label: 'Seller phone',     type: 'text'   },
  { key: 'drive_links',          label: 'Google Drive URLs (one per line)', type: 'textarea' },
  { key: 'additional_comments',  label: 'Additional comments', type: 'textarea' },
];

export default function EditFieldsSection({ submission, canAct, onChanged }) {
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [busy, setBusy] = useState(false);

  // Admin-only: the save endpoint is admin-gated (see header comment). canAct is
  // still accepted in the signature for a uniform section API, but the render
  // gate is admin.
  const isAdmin = getUser()?.role === 'admin';
  if (!submission || !isAdmin) return null;
  const s = submission;

  const startEdit = () => {
    const form = {};
    EDITABLE_FIELDS.forEach(({ key }) => {
      form[key] = s[key] ?? '';
    });
    setEditForm(form);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (busy) return;
    // Build payload of only changed fields.
    const payload = {};
    EDITABLE_FIELDS.forEach(({ key, type }) => {
      const newVal = editForm[key];
      const oldVal = s[key];
      const normalizedOld = oldVal === null || oldVal === undefined ? '' : String(oldVal);
      const normalizedNew = newVal === null || newVal === undefined ? '' : String(newVal);
      if (normalizedOld !== normalizedNew) {
        if (type === 'number' && newVal !== '') {
          payload[key] = parseInt(newVal, 10);
        } else {
          payload[key] = newVal === '' ? null : newVal;
        }
      }
    });

    if (Object.keys(payload).length === 0) {
      setEditMode(false);
      return;
    }

    setBusy(true);
    try {
      await api.adminUpdateSubmission(s.id, payload);
      setEditMode(false);
      const fresh = await api.adminGetSubmission(s.id);
      onChanged?.({ ...fresh.submission, events: fresh.events });
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  if (!editMode) {
    return (
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn-soft" onClick={startEdit} disabled={busy}>✏ Edit</button>
      </div>
    );
  }

  return (
    <div className="card-block">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ marginBottom: 0 }}>Edit unit details</h3>
        <small className="muted" style={{ fontWeight: 400 }}>Society &amp; CP cannot be changed</small>
      </div>
      <div className="form-grid">
        {EDITABLE_FIELDS.map(({ key, label, type }) => (
          <div key={key} className={type === 'textarea' ? 'form-wide-2' : ''}>
            <label>{label}</label>
            {type === 'textarea' ? (
              <textarea
                rows={3}
                value={editForm[key] ?? ''}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
              />
            ) : (
              <input
                type={type}
                value={editForm[key] ?? ''}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" className="btn-primary" onClick={saveEdit} disabled={busy}>
          {busy ? 'Saving…' : '✓ Save changes'}
        </button>
        <button type="button" className="btn-ghost" onClick={cancelEdit} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}
