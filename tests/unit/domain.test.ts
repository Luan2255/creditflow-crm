import { describe, expect, it } from "vitest";
import {
  calculateCommission,
  calculatePriceInstallment,
  canTransitionProposal,
  formatCpf,
  isValidCpf,
} from "@/lib/domain";

describe("CPF", () => {
  it("accepts synthetic CPFs with valid check digits and rejects invalid values", () => {
    expect(isValidCpf("90000000094")).toBe(true);
    expect(isValidCpf("900.000.000-95")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
  });

  it("masks the identifying digits for restricted roles", () => {
    expect(formatCpf("90000000094", false)).toBe("***.000.000-**");
  });
});

describe("Price installment", () => {
  it("splits principal evenly when the rate is zero", () => {
    expect(calculatePriceInstallment(1_200, 0, 12)).toBe(100);
  });

  it("calculates a fixed monthly installment for a positive rate", () => {
    expect(calculatePriceInstallment(1_000, 1, 12)).toBeCloseTo(88.85, 2);
  });
});

describe("commission and proposal transitions", () => {
  it("rounds commission to cents", () => {
    expect(calculateCommission(1_234.56, 10)).toBe(123.46);
  });

  it("allows only the defined forward pipeline transitions", () => {
    expect(canTransitionProposal("CONSULTA", "DIGITACAO")).toBe(true);
    expect(canTransitionProposal("ANALISE", "PAGA")).toBe(false);
    expect(canTransitionProposal("PAGA", "ANALISE")).toBe(false);
  });
});
