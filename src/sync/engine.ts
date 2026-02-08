import { mapProcareActivity, mapProcareKid } from "../api/mapper.js";
import type { ProcareApiClient } from "../api/client.js";
import type { DataProvider } from "../provider/interface.js";
import type { Activity, Child } from "../types.js";

export interface SyncEngineOptions {
  apiClient: ProcareApiClient;
  provider: DataProvider;
  syncDaysBack?: number;
  now?: () => Date;
}

export interface SyncKidResult {
  kidId: string;
  storedActivities: number;
  sinceDate: string;
}

export interface SyncAllResult {
  syncedChildren: number;
  syncedActivities: number;
  perKid: SyncKidResult[];
  syncedAt: string;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

export class SyncEngine {
  private readonly apiClient: ProcareApiClient;
  private readonly provider: DataProvider;
  private readonly syncDaysBack: number;
  private readonly now: () => Date;

  constructor(options: SyncEngineOptions) {
    this.apiClient = options.apiClient;
    this.provider = options.provider;
    this.syncDaysBack = options.syncDaysBack ?? 7;
    this.now = options.now ?? (() => new Date());
  }

  async syncAll(): Promise<SyncAllResult> {
    const children = await this.syncChildren();
    const perKid: SyncKidResult[] = [];

    for (const child of children) {
      perKid.push(await this.syncKid(child.id));
    }

    const syncedAt = this.now().toISOString();
    await this.provider.setSyncMetadata("last_sync_time", syncedAt);

    return {
      syncedChildren: children.length,
      syncedActivities: perKid.reduce((total, item) => total + item.storedActivities, 0),
      perKid,
      syncedAt,
    };
  }

  async syncChildren(): Promise<Child[]> {
    const response = await this.apiClient.getKids();
    const children = response.kids.map(mapProcareKid);

    for (const child of children) {
      await this.provider.upsertChild(child);
    }

    return children;
  }

  async syncKid(kidId: string, sinceDate?: string): Promise<SyncKidResult> {
    const today = toIsoDate(this.now());
    const metadataKey = `last_sync_${kidId}`;

    const resolvedSinceDate =
      sinceDate ??
      (await this.provider.getSyncMetadata(metadataKey)) ??
      toIsoDate(subtractDays(this.now(), this.syncDaysBack));

    const rawActivities = await this.apiClient.getAllDailyActivities(kidId, today);
    const filtered = rawActivities.filter(
      (activity) => activity.activity_date >= resolvedSinceDate,
    );

    const mappedActivities = filtered.flatMap((raw) => mapProcareActivity(raw));
    const scopedActivities = mappedActivities.filter(
      (activity) => activity.childId === kidId,
    );

    await this.writeActivities(scopedActivities);
    await this.provider.setSyncMetadata(metadataKey, today);

    return {
      kidId,
      storedActivities: scopedActivities.length,
      sinceDate: resolvedSinceDate,
    };
  }

  private async writeActivities(activities: Activity[]): Promise<void> {
    if (activities.length === 0) {
      return;
    }

    await this.provider.addActivities(activities);
  }
}
