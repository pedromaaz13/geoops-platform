export function formatDate(value: string | null | undefined): string {
  if (!value) return 'desconocido';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatAgeFromSeconds(value: number | null | undefined): string {
  if (value == null) return 'sin dato';
  if (value < 60) return `${Math.round(value)} s`;
  if (value < 3600) return `${Math.round(value / 60)} min`;
  if (value < 86_400) return `${(value / 3600).toFixed(1)} h`;
  return `${(value / 86_400).toFixed(1)} d`;
}

export function formatAgeFromDate(value: string | null | undefined): string {
  if (!value) return 'sin dato';
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  return formatAgeFromSeconds(seconds);
}

export function formatMeters(value: number | null | undefined): string {
  if (value == null) return 'sin precision';
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

export function asNumber(value: FormDataEntryValue | null): number {
  return typeof value === 'string' ? Number(value) : Number.NaN;
}

export function asText(value: FormDataEntryValue | null, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
