import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preview, type PreviewProfile } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/store/auth";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PROFILE: PreviewProfile = {
  sex: "male",
  age: 30,
  height_cm: 180,
  current_weight_kg: 80,
  activity_level: "moderate",
  goal: "lose",
  target_rate_kg_per_week: 0.5,
};

describe("guest preview endpoints", () => {
  beforeEach(() => {
    // Even with a token present, guest preview must NOT attach Authorization.
    useAuth.setState({ accessToken: "should-not-be-sent", refreshToken: null, user: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it("posts the profile to /public/nutrition/preview without a bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ target_calories: 2200 }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await preview.nutrition(PROFILE);
    expect(out.target_calories).toBe(2200);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/public/nutrition/preview");
    expect(init.method).toBe("POST");
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
    expect(JSON.parse(init.body as string)).toEqual({ profile: PROFILE, maintenance_kcal: null });
  });

  it("passes a calibrated maintenance figure when supplied", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ target_calories: 2100 }));
    vi.stubGlobal("fetch", fetchMock);
    await preview.nutrition(PROFILE, 2600);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).maintenance_kcal).toBe(2600);
  });
});
