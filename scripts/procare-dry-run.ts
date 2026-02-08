import { authenticateProcare } from "../src/api/auth.js";
import { ProcareApiClient } from "../src/api/client.js";
import { loadConfig } from "../src/sync/config.js";

const config = loadConfig();

if (!config.authEmail || !config.authPassword) {
  throw new Error(
    "Missing PROCARE_AUTHENTICATION_EMAIL or PROCARE_AUTHENTICATION_PASSWORD",
  );
}

const auth = await authenticateProcare({
  email: config.authEmail,
  password: config.authPassword,
  baseUrl: config.authBaseUrl,
});

const today = new Date().toISOString().slice(0, 10);

async function runWithMode(mode: "bearer" | "query") {
  const client = new ProcareApiClient({
    authToken: auth.authToken,
    baseUrl: config.apiBaseUrl,
    authMode: mode,
    minRequestIntervalMs: 5000,
  });

  const kidsResp = await client.getKids();
  const firstKid = kidsResp.kids[0];

  if (!firstKid) {
    return {
      mode,
      kidsCount: 0,
      firstKidId: null,
      page: null,
      perPage: null,
      activitiesReturned: 0,
    };
  }

  const activities = await client.getDailyActivities({
    kidId: firstKid.id,
    dateTo: today,
    page: 1,
  });

  return {
    mode,
    kidsCount: kidsResp.kids.length,
    firstKidId: firstKid.id,
    page: activities.page,
    perPage: activities.per_page,
    activitiesReturned: activities.daily_activities.length,
  };
}

try {
  const result = await runWithMode("bearer");
  console.log(
    JSON.stringify(
      {
        ok: true,
        tokenPrefix: `${auth.authToken.slice(0, 14)}...`,
        ...result,
      },
      null,
      2,
    ),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("(401)") || message.includes("(403)")) {
    const fallback = await runWithMode("query");
    console.log(
      JSON.stringify(
        {
          ok: true,
          tokenPrefix: `${auth.authToken.slice(0, 14)}...`,
          fallbackFrom: "bearer",
          ...fallback,
        },
        null,
        2,
      ),
    );
  } else {
    throw error;
  }
}
