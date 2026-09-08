export function formatDate(value?: string | null): string {
  return value ? value.split("-").reverse().join(".") : "—";
}

export function formatMoney(value: number): string {
  return (
    new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 2 }).format(value) +
    " ₸"
  );
}
