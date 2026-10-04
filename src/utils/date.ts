export function sessionDate(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function monthLabel(iso: string): string {
  const d = new Date(iso);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}
