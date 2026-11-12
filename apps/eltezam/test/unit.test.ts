import { describe, expect, it } from "vitest";
import { accessLevel, canUsePremium, formatCountdown, trialRemainingMs } from "@/lib/access";
import { parseCsv, describe as describeTable, groupSum } from "@/lib/dataParse";
import { emptyCv, matchJobDescription, atsChecks } from "@/lib/cv";
import { whatsappLink } from "@/lib/utils";
import seed from "@/data/seed.json";
import { SERVICE_CONTENT, SERVICE_ORDER } from "@/data/services";

const now = Date.parse("2026-11-12T10:00:00Z");
describe("access / trial", () => {
  it("computes levels from server fields", () => {
    expect(accessLevel(null)).toBe("guest");
    expect(accessLevel({ role: "admin", account_status: "expired", trial_ends_at: null }, now)).toBe("admin");
    expect(accessLevel({ role: "client", account_status: "trial", trial_ends_at: "2026-11-12T11:00:00Z" }, now)).toBe("trial");
    expect(accessLevel({ role: "client", account_status: "trial", trial_ends_at: "2026-11-12T09:59:59Z" }, now)).toBe("expired");
    expect(accessLevel({ role: "client", account_status: "active", trial_ends_at: null }, now)).toBe("active");
    expect(accessLevel({ role: "client", account_status: "suspended", trial_ends_at: "2030-01-01T00:00:00Z" }, now)).toBe("suspended");
  });
  it("premium only for admin/active/trial", () => {
    expect(["admin", "active", "trial"].every((l) => canUsePremium(l as never))).toBe(true);
    expect(canUsePremium("expired")).toBe(false);
  });
  it("countdown formatting", () => {
    expect(trialRemainingMs({ trial_ends_at: "2026-11-12T11:30:05Z" }, now)).toBe(5405000);
    expect(formatCountdown(5405000)).toBe("01:30:05");
  });
});

describe("data analysis (real stats, no fabrication)", () => {
  const t = parseCsv('region,product,sales\nRiyadh,A,100\nJeddah,B,"1,250"\nRiyadh,C,50\n');
  it("parses quoted numbers", () => { expect(t.rows[1][2]).toBe(1250); });
  it("describes columns", () => {
    const s = describeTable(t);
    expect(s[2]).toMatchObject({ type: "number", sum: 1400, min: 50, max: 1250 });
    expect(s[0].type).toBe("text");
  });
  it("groups sums", () => { expect(groupSum(t, 0, 2)).toEqual([["Jeddah", 1250], ["Riyadh", 150]]); });
});

describe("CV tools", () => {
  it("job description match only reflects the user's own data", () => {
    const cv = emptyCv();
    cv.skills = "Primavera P6, AutoCAD, Excel";
    const r = matchJobDescription(cv, "We need Primavera planning engineer with AutoCAD and Revit experience");
    expect(r.found).toContain("primavera");
    expect(r.missing).toContain("revit");
    expect(r.score).toBeGreaterThan(0);
  });
  it("ATS checks", () => { expect(atsChecks(emptyCv()).score).toBeLessThan(50); });
});

describe("content & config", () => {
  it("whatsapp links are validated", () => {
    expect(whatsappLink("+966 56 532 4387")).toBe("https://wa.me/966565324387");
    expect(whatsappLink("")).toBeNull();
    expect(whatsappLink("123")).toBeNull();
  });
  it("every service has a page config and seed row", () => {
    SERVICE_ORDER.forEach((slug) => {
      expect(SERVICE_CONTENT[slug]).toBeDefined();
      expect(seed.services.some((s) => s.slug === slug)).toBe(true);
    });
  });
  it("seed prices are not invented (null = request a quote)", () => {
    expect(seed.packages.every((p) => p.price === null)).toBe(true);
    expect(seed.portfolio_items.every((p) => p.is_demo)).toBe(true);
  });
  it("academy includes the requested courses", () => {
    const courses = seed.site_settings.find((s) => s.setting_key === "courses")!.setting_value as { title: string }[];
    const titles = courses.map((c) => c.title).join(" ");
    for (const k of ["إدارة المشاريع", "التحليل الفني", "التحليل المالي", "تصميم وتخطيط المواقع", "Vibe Coding"]) expect(titles).toContain(k);
  });
});
