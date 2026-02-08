import type {
  ProcareDailyActivitiesResponse,
  ProcareDailyActivity,
  ProcareKidsResponse,
  ProcareListOptions,
  ProcareUser,
} from "./types.js";

export type ProcareAuthMode = "bearer" | "query";

export interface ProcareApiClientOptions {
  authToken: string;
  baseUrl?: string;
  authMode?: ProcareAuthMode;
  fetchImpl?: typeof fetch;
  minRequestIntervalMs?: number;
}

export interface GetDailyActivitiesOptions {
  kidId: string;
  dateTo: string;
  page?: number;
}

export class ProcareApiClient {
  private readonly fetchImpl: typeof fetch;
  private readonly authToken: string;
  private readonly baseUrl: string;
  private readonly minRequestIntervalMs: number;
  private readonly authMode: ProcareAuthMode;
  private lastRequestAt = 0;

  constructor(options: ProcareApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.authToken = options.authToken;
    this.baseUrl =
      options.baseUrl?.replace(/\/$/, "") ??
      "https://api-school.procareconnect.com/api/web";
    this.minRequestIntervalMs = options.minRequestIntervalMs ?? 1200;
    this.authMode = options.authMode ?? "bearer";
  }

  async getUser(): Promise<ProcareUser> {
    return this.requestJson<ProcareUser>("/user/");
  }

  async getKids(): Promise<ProcareKidsResponse> {
    return this.requestJson<ProcareKidsResponse>("/parent/kids/");
  }

  async getListOptions(): Promise<ProcareListOptions> {
    return this.requestJson<ProcareListOptions>("/list_options/");
  }

  async getDailyActivities(
    options: GetDailyActivitiesOptions,
  ): Promise<ProcareDailyActivitiesResponse> {
    const page = options.page ?? 1;
    const params = new URLSearchParams();
    params.set("kid_id", options.kidId);
    params.set("filters[daily_activity][date_to]", options.dateTo);
    params.set("page", String(page));

    return this.requestJson<ProcareDailyActivitiesResponse>(
      `/parent/daily_activities/?${params.toString()}`,
    );
  }

  async getAllDailyActivities(
    kidId: string,
    dateTo: string,
  ): Promise<ProcareDailyActivity[]> {
    let page = 1;
    const allActivities: ProcareDailyActivity[] = [];

    while (true) {
      const response = await this.getDailyActivities({
        kidId,
        dateTo,
        page,
      });

      allActivities.push(...response.daily_activities);

      if (
        response.per_page <= 0 ||
        response.daily_activities.length < response.per_page
      ) {
        break;
      }

      page += 1;
    }

    return allActivities;
  }

  private async requestJson<T>(path: string): Promise<T> {
    await this.waitForThrottle();

    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      accept: "application/json, text/plain, */*",
    };
    if (this.authMode === "bearer") {
      headers.authorization = `Bearer ${this.authToken}`;
    }

    const response = await this.fetchImpl(url, {
      method: "GET",
      headers,
    });

    this.lastRequestAt = Date.now();

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Procare API request failed (${response.status}) for ${path}: ${body || response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private buildUrl(path: string): string {
    const trimmedPath = path.startsWith("/") ? path : `/${path}`;

    if (this.authMode !== "query") {
      return `${this.baseUrl}${trimmedPath}`;
    }

    const url = new URL(`${this.baseUrl}${trimmedPath}`);
    url.searchParams.set("auth_token", this.authToken);
    return url.toString();
  }

  private async waitForThrottle(): Promise<void> {
    if (this.minRequestIntervalMs <= 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    const waitMs = this.minRequestIntervalMs - elapsed;
    if (waitMs > 0) {
      await Bun.sleep(waitMs);
    }
  }
}
