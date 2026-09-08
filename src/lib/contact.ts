export type NewPublicContactType = "email" | "phone";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const phoneCharactersPattern = /^\+?[\d\s()-]+$/u;

export function newPublicContactType(value: string): NewPublicContactType | null {
  const contact = value.trim();
  if (emailPattern.test(contact)) return "email";
  if (!phoneCharactersPattern.test(contact)) return null;
  const digits = contact.replace(/\D/gu, "");
  return digits.length >= 10 && digits.length <= 15 ? "phone" : null;
}

export function isNewPublicContact(value: string): boolean {
  return newPublicContactType(value) !== null;
}
