import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { foods } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/store/auth";
import ErrorBoundary from "@/app/error";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("foods barcode + favorites endpoints", () => {
  beforeEach(() => {
    useAuth.setState({ accessToken: "tok", refreshToken: "ref", user: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it("byBarcode hits the barcode path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 7, name: "Milk" }));
    vi.stubGlobal("fetch", fetchMock);
    const food = await foods.byBarcode("737628064502");
    expect(food).toMatchObject({ id: 7 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/foods/barcode/737628064502");
  });

  it("removeFavorite issues a DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await foods.removeFavorite(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/foods/7/favorite");
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("addFavorite issues a PUT", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await foods.addFavorite(7);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("PUT");
  });
});

describe("global error boundary", () => {
  it("renders a fallback and retries via reset", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledOnce();
  });
});
