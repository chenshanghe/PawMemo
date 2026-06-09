import { db } from "@workspace/db";
import { subscriptionEventsTable } from "@workspace/db";

export type SubEventType =
  | "registered"
  | "upgraded"
  | "downgraded"
  | "cancelled"
  | "resumed"
  | "expired";

export async function logSubEvent(opts: {
  userId: string;
  eventType: SubEventType;
  fromTier?: string | null;
  toTier?: string | null;
  amountFen?: number;
  orderNo?: string | null;
  note?: string | null;
}): Promise<void> {
  try {
    await db.insert(subscriptionEventsTable).values({
      userId: opts.userId,
      eventType: opts.eventType,
      fromTier: opts.fromTier ?? null,
      toTier: opts.toTier ?? null,
      amountFen: opts.amountFen ?? 0,
      orderNo: opts.orderNo ?? null,
      note: opts.note ?? null,
    });
  } catch (err) {
    console.error("[sub-events] failed to log event", opts.eventType, err);
  }
}
