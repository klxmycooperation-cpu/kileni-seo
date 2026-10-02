export type NewPublicContactType = "email";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function newPublicContactType(value: string): NewPublicContactType | null {
  const contact = value.trim();
  if (emailPattern.test(contact)) return "email";
  return null;
}

export function isNewPublicContact(value: string): boolean {
  return newPublicContactType(value) !== null;
}
