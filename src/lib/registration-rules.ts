export function isEducationEmail(email: string): boolean {
  return /^[^@\s]+@(?:[a-z0-9-]+\.)+edu(?:\.ph)?$/i.test(email.trim());
}
export function validUsername(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(value);
}
