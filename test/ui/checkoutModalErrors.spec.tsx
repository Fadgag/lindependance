import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CheckoutAppointment } from "@/types/models";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));
const sessionMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("next-auth/react", () => ({ useSession: sessionMock }));
vi.mock("@/components/dashboard/ProductPicker", () => ({ default: () => null }));

import CheckoutModal from "@/components/dashboard/CheckoutModal";

const fetchMock = vi.fn<typeof fetch>();

const appointment: CheckoutAppointment = {
  id: "appointment-1",
  service: { name: "Coupe", price: 45 },
  customer: { name: "Camille" },
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.mockReturnValue({ data: { user: { role: "ADMIN" } }, status: "authenticated" });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CheckoutModal error feedback", () => {
  it("shows a safe actionable message when the checkout request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(500, { error: "Database password leaked" }));

    render(<CheckoutModal appointment={appointment} onClose={vi.fn()} onRefresh={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirmer l'encaissement" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("Le règlement n'a pas pu être enregistré"),
      );
    });
    expect(toastMock.error.mock.calls[0]?.[0]).not.toContain("Database password");
  });

  it("explains how to recover from a network failure", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<CheckoutModal appointment={appointment} onClose={vi.fn()} onRefresh={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirmer l'encaissement" }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("Vérifiez votre connexion"),
      );
    });
  });

  it("hides custom extras editing for non-admin staff", async () => {
    sessionMock.mockReturnValue({ data: { user: { role: "USER" } }, status: "authenticated" });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

    render(<CheckoutModal appointment={appointment} onClose={vi.fn()} onRefresh={vi.fn()} />);

    expect(await screen.findByText("Suppléments")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^\+\s*AJOUTER$/i })).not.toBeInTheDocument();
  });
});
