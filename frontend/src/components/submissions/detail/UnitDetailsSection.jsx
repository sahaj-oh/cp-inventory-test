/**
 * Unit details — read-only grid (Tower / Unit No / BHK / Area / Floor /
 * Occupancy). Ported from CP DetailPanel.jsx ("Unit details" block + the
 * local `Row` helper), extended to also surface Tower/Unit No (previously
 * only shown combined in the panel's header subtitle, not in a field grid)
 * per this section's spec. No staff-only behavior — always visible,
 * always read-only.
 */
import { formatBhk } from '../../../format';

function Field({ label, value, optional = false }) {
  return (
    <div className="field-row">
      <div className="field-lbl">{label}</div>
      <div className="field-val">
        {value || (optional ? '—' : <span className="muted" style={{ fontStyle: 'italic' }}>Missing</span>)}
      </div>
    </div>
  );
}

export default function UnitDetailsSection({ submission }) {
  if (!submission) return null;
  const s = submission;
  return (
    <div className="card-block">
      <h3>Unit details</h3>
      <div className="field-grid-2">
        <Field label="Tower" value={s.tower} />
        <Field label="Unit No" value={s.unit_no} />
        <Field label="BHK" value={formatBhk(s.bhk, false)} />
        <Field label="Area" value={s.sqft ? `${s.sqft} sqft` : null} />
        <Field label="Floor" value={s.floor} />
        <Field label="Occupancy" value={s.occupancy_status} />
      </div>
    </div>
  );
}
