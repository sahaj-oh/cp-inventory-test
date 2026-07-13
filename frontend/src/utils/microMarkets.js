// Micro-markets are not plotted in this app — no-op stubs so ScopeMap stays a
// verbatim port of Direct_Inventory's. Populate `items` / lookupMicro if
// micro-market marks are ever needed here.
export async function microMarkets() {
  return { items: [] };
}
export function lookupMicro() {
  return null;
}
