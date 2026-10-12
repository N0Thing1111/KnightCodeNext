export const BACKUP_BUCKET = "school-backup-transfers";
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
export const MAX_BACKUP_JSON_BYTES = 128 * 1024 * 1024;
export const TRANSFER_LIFETIME_MS = 2 * 60 * 60 * 1000;
export function validateTransferPath(path: string, adminId: string, now = Date.now(), allowExpired = false) {
 const pieces = path.split("/");
 if (pieces.length !== 2 || pieces[0] !== adminId || !/^\d{13}-[0-9a-f-]{36}\.knightsave$/.test(pieces[1])) throw Error("Invalid backup transfer.");
 const age = now - Number(pieces[1].slice(0,13));
 if (age < -60000 || (!allowExpired && age > TRANSFER_LIFETIME_MS)) throw Error("Backup transfer expired. Select the file again.");
 return path;
}
