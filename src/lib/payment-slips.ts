import "server-only";
import { storePrivateFile, removePrivateFile, signPrivateFile } from "@/lib/private-files";

/**
 * Customer payment slips: private 'payment-slips' bucket, one folder per customer (migration 0033).
 * portal_submit_slip only accepts paths in the customer's own folder. File checks are the same as
 * support chat attachments (readChatFile).
 */
const BUCKET = "payment-slips";
export const SLIP_CURRENCIES = ["USD", "JPY", "EUR", "GBP"] as const;

export const storeSlipFile = (customerId: string, file: File) => storePrivateFile(BUCKET, customerId, file);
export const removeSlipFile = (path: string) => removePrivateFile(BUCKET, path);
export const signSlipFile = (path: string, downloadName?: string) => signPrivateFile(BUCKET, path, downloadName);
