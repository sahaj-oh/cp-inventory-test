// Animated dot-loop loading indicator (". → ....."). Renders ONLY the dots —
// no "Loading" text anywhere. `full` centers it (viewport/large area).
export default function Loading({ full = false }) {
  if (full) {
    return (
      <div className="loading" role="status" aria-label="Loading">
        <span className="loading-dots" aria-hidden="true" />
      </div>
    );
  }
  return <span className="loading-dots" role="status" aria-label="Loading" />;
}
