/** Labels and number formatting for Reevit's own mobile money screens. */

export const NETWORK_LABEL: Record<string, string> = {
  mtn: 'MTN MoMo',
  telecel: 'Telecel Cash',
  airteltigo: 'AirtelTigo Money',
  mpesa: 'M-Pesa',
};

/** 0244128890 -> "024 412 8890"; 254712345678 -> "+254 712 345 678". Anything else as given. */
export function formatPayerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  if (digits.startsWith('233') && digits.length === 12) return formatPayerPhone(`0${digits.slice(3)}`);
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return phone;
}

/** 125 -> "2:05" */
export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
