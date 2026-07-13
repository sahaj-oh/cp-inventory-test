// City boundary polygons are not plotted in this app (the coverage map shows
// society markers only). Kept as a no-op so ScopeMap stays a verbatim port of
// Direct_Inventory's — wire this to a real OSM boundary source if cities are
// ever shaded here.
export async function cityBoundary() {
  return null;
}
