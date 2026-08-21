/**
 * Unsigned `instant` query snapshots were accepted by an earlier preview.
 * They can be forged, so public results now come exclusively from an opaque
 * token resolved in the server database. Keep this rejection shim only for
 * callers that still import the legacy decoder while old links expire.
 */
export function decodeInstantAuditSnapshot(_value: string | null | undefined): null {
  void _value;
  return null;
}
