export interface ProcareAuthOptions {
  email: string;
  password: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface ProcareAuthResponse {
  authToken: string;
  raw: unknown;
}

interface CandidateAuthShape {
  auth_token?: string;
  user?: { auth_token?: string };
  data?: { auth_token?: string; user?: { auth_token?: string } };
}

function extractAuthToken(raw: unknown): string | null {
  const payload = raw as CandidateAuthShape;
  return (
    payload?.auth_token ??
    payload?.user?.auth_token ??
    payload?.data?.auth_token ??
    payload?.data?.user?.auth_token ??
    null
  );
}

export async function authenticateProcare(
  options: ProcareAuthOptions,
): Promise<ProcareAuthResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl =
    options.baseUrl?.replace(/\/$/, "") ??
    "https://online-auth.procareconnect.com";

  const response = await fetchImpl(`${baseUrl}/sessions/`, {
    method: "POST",
    headers: {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      referer: "https://schools.procareconnect.com/",
    },
    body: JSON.stringify({
      email: options.email,
      password: options.password,
      role: "carer",
      platform: "web",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Procare authentication failed (${response.status}): ${text || response.statusText}`,
    );
  }

  const payload = await response.json();
  const authToken = extractAuthToken(payload);

  if (!authToken) {
    throw new Error(
      "Procare authentication succeeded but no auth token was returned.",
    );
  }

  return { authToken, raw: payload };
}
