import { describe, expect, it } from "vitest";
import { getUserFacingMutationError, getUserFacingNetworkError } from "@/lib/userFacingMutationError";

describe("user-facing mutation errors", () => {
  it("distinguishes a scheduling conflict from an unexpected server failure", () => {
    expect(getUserFacingMutationError("appointment-save", 409)).toContain("Choisissez un autre horaire");
    expect(getUserFacingMutationError("appointment-save", 500)).toContain("actualisez l'agenda");
  });

  it("gives corrective steps for invalid opening hours", () => {
    expect(getUserFacingMutationError("schedule-update", 400)).toContain("ouverture est avant la fermeture");
  });

  it("suggests checking the agenda before retrying an uncertain network operation", () => {
    expect(getUserFacingNetworkError("appointment-delete")).toContain("actualisez l'agenda");
    expect(getUserFacingNetworkError("unavailability-save")).toContain("actualisez l'agenda");
  });

  it("keeps server internals out of permission and session errors", () => {
    expect(getUserFacingMutationError("finance-update", 401)).toContain("Reconnectez-vous");
    expect(getUserFacingMutationError("finance-update", 403)).toContain("pas autorisé");
  });
});
