// End-to-end QA in local demo mode (no Supabase): `npm run build && npm run test:e2e`.
// Starts `vite preview`, drives Chromium through the main user + admin journeys and prints a checklist.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.E2E_OUT || "test/e2e-output";
mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`); };

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/images\.unsplash|ERR_|Failed to load resource|net::/.test(m.text())) errors.push(m.text()); });

const vis = async (loc, timeout = 6000) => { try { await loc.first().waitFor({ state: "visible", timeout }); return true; } catch { return false; } };
const go = async (p) => { await page.goto(BASE + p, { waitUntil: "networkidle" }); };
const register = async (name, email, phone = "+966500000000") => {
  await go("/register");
  await page.getByLabel(/الاسم الكامل/).fill(name);
  await page.getByLabel(/البريد الإلكتروني/).fill(email);
  await page.getByLabel(/رقم الهاتف/).fill(phone);
  await page.getByLabel(/^كلمة المرور/).fill("Passw0rd!");
  await page.getByLabel(/تأكيد كلمة المرور/).fill("Passw0rd!");
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /أنشئ حسابي/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
};
const signOut = async () => { await page.getByRole("button", { name: /خروج/ }).click(); await page.waitForTimeout(400); };
const login = async (email) => {
  await go("/login");
  await page.getByLabel(/البريد الإلكتروني/).fill(email);
  await page.getByLabel(/كلمة المرور/).fill("Passw0rd!");
  await page.getByRole("button", { name: /^دخول$/ }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
};
const submitWebsiteRequest = async (title) => {
  await go("/services/websites");
  await page.locator("#request").scrollIntoViewIfNeeded();
  await page.getByLabel(/اسم المشروع/).fill(title);
  await page.getByLabel(/مجال العمل/).fill("مقاولات");
  await page.getByLabel(/وصف الفكرة والتفاصيل/).fill("موقع تعريفي لشركة مقاولات مع صفحة مشاريع ونموذج طلب عرض سعر");
};

try {
  // 1. Home + hero + non-locked scroll
  await go("/");
  ok("Home loads with hero headline", await vis(page.getByRole("heading", { level: 1 }).first()));
  await page.mouse.wheel(0, 1800); await page.waitForTimeout(700);
  const y = await page.evaluate(() => window.scrollY);
  ok("Hero does not lock page scroll", y > 500, `scrollY=${y}`);
  ok("Body is never position:fixed", (await page.evaluate(() => getComputedStyle(document.body).position)) !== "fixed");
  await page.mouse.wheel(0, -1800); await page.waitForTimeout(500);
  ok("Reverse scroll works", (await page.evaluate(() => window.scrollY)) < y);
  ok("8 service cards on home", (await page.locator('a[href^="/services/"]').filter({ has: page.locator("h3") }).count()) === 8);
  ok("Signature in footer", await vis(page.getByText("Eng. Ahmed Zahran").last()));
  ok("WhatsApp floating button uses wa.me", ((await page.locator('a[aria-label="WhatsApp"]').first().getAttribute("href")) ?? "").startsWith("https://wa.me/966"));
  await page.screenshot({ path: `${OUT}/home-desktop.png` });

  // 2. Language + nested refresh
  await page.getByRole("button", { name: "language" }).first().click();
  ok("Language switch to English (dir=ltr)", (await page.evaluate(() => document.documentElement.dir)) === "ltr");
  await page.getByRole("button", { name: "language" }).first().click();
  await go("/services/cv-studio"); await page.reload({ waitUntil: "networkidle" });
  ok("Nested route survives refresh", await vis(page.getByRole("heading", { level: 1 })));
  await go("/academy");
  ok("Academy lists courses incl. PMP & vibe coding", (await page.getByText(/PMP/).count()) > 0 && (await page.getByText(/Vibe Coding/).count()) > 0);

  // 3. Portfolio video modal
  await go("/portfolio");
  await page.getByRole("button", { name: /تشغيل الفيديو/ }).first().click();
  ok("Portfolio video opens in modal", await vis(page.locator("dialog, [role=dialog] video").first()));
  await page.keyboard.press("Escape");

  // 4. Contact form (guest)
  await go("/contact");
  await page.getByLabel(/^الاسم/).fill("زائر");
  await page.getByLabel(/البريد الإلكتروني/).fill("visitor@example.com");
  await page.getByLabel(/الموضوع/).fill("استفسار عن موقع");
  await page.getByLabel(/الرسالة/).fill("أرغب في تصميم موقع لشركتي");
  await page.getByRole("button", { name: /^إرسال$/ }).click();
  ok("Contact message saved", await vis(page.getByText(/تم استلام رسالتك/)));

  // 5. First account → admin (local demo), then client
  await register("Eng. Admin", "admin@eltezam.test");
  await signOut();
  await register("عميل تجريبي", "client@eltezam.test");
  ok("Trial countdown visible after signup", await vis(page.getByText(/الوقت المتبقي في تجربتك المجانية/)));
  const cd = await page.locator("p.tabular-nums").first().textContent();
  ok("Countdown ~24h", /^2[34]:\d\d:\d\d$/.test(cd?.trim() ?? ""), cd ?? "");
  await page.screenshot({ path: `${OUT}/client-dashboard.png` });

  // 6. Website request with attachment
  await submitWebsiteRequest("موقع شركة الإنجاز");
  writeFileSync(`${OUT}/brief.txt`, "brief");
  await page.locator('#request input[type="file"]').setInputFiles(`${OUT}/brief.txt`);
  await page.getByRole("button", { name: /اطلب تصميم موقعك الآن/ }).last().click();
  await page.waitForURL(/\/dashboard\/projects\//, { timeout: 10000 });
  ok("Website request created", await vis(page.getByRole("heading", { name: "موقع شركة الإنجاز" })));
  ok("Attachment stored", await vis(page.getByText("brief.txt")));
  const projectUrl = page.url();

  // 7. CV Studio save + DOCX
  await go("/cv-studio");
  await page.getByLabel(/الاسم الكامل/).first().fill("عميل تجريبي");
  await page.getByLabel(/المسمى الوظيفي/).first().fill("مهندس مدني");
  await page.getByRole("button", { name: /^حفظ$/ }).click();
  await page.waitForTimeout(500);
  ok("CV saved to account", await vis(page.getByText(/النسخ المحفوظة/)));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Word" }).click()]);
  const docxPath = `${OUT}/cv.docx`; await dl.saveAs(docxPath);
  const { readFileSync } = await import("node:fs");
  ok("CV Word (.docx) download is a real DOCX (zip)", readFileSync(docxPath).subarray(0, 2).toString() === "PK", dl.suggestedFilename());
  await page.getByRole("button", { name: /^التالي/ }).click();
  await page.getByRole("button", { name: /اكتب\/حسّن الملخص/ }).click();
  await page.waitForTimeout(500);
  ok("AI without provider shows activation notice", (await page.getByText(/تحتاج إلى تفعيل التكامل/).count()) > 0);

  // 8. Video studio request
  await go("/video-studio");
  await page.getByLabel(/اسم الشركة أو المنتج/).fill("مطعم الذوق");
  await page.getByLabel(/فكرة الفيديو/).fill("إعلان قصير عن افتتاح فرع جديد مع عرض خاص");
  await page.getByRole("button", { name: /أنشئ فيديو مشروعك الآن/ }).click();
  await page.waitForURL(/\/dashboard\/projects\//, { timeout: 10000 });
  ok("Video project created", await vis(page.getByText(/مشروع الفيديو/).first()));

  // 9. Trial limit (3 requests)
  await submitWebsiteRequest("طلب ثالث");
  await page.getByRole("button", { name: /اطلب تصميم موقعك الآن/ }).last().click();
  await page.waitForURL(/\/dashboard\/projects\//, { timeout: 10000 });
  await submitWebsiteRequest("طلب رابع");
  await page.getByRole("button", { name: /اطلب تصميم موقعك الآن/ }).last().click();
  await page.waitForTimeout(800);
  ok("4th request blocked by trial limit", await vis(page.getByText(/حد التجربة/).first()));

  // 10. Client blocked from admin
  await go("/admin");
  ok("Client cannot open /admin", await vis(page.getByText(/غير مصرح لك/)));
  await go("/dashboard"); await signOut();

  // 11. Admin manages project
  await login("admin@eltezam.test");
  await go("/admin");
  ok("Admin overview shows real counts", (await page.getByText("إجمالي العملاء").count()) > 0);
  await page.screenshot({ path: `${OUT}/admin-overview.png` });
  const pid = projectUrl.split("/").pop();
  await go(`/admin/projects/${pid}`);
  await page.getByPlaceholder("المبلغ").fill("3500");
  await page.getByRole("button", { name: /إرسال العرض/ }).click();
  await page.waitForTimeout(500);
  ok("Admin sent quote", await vis(page.getByText(/تم إرسال عرض السعر/).first()));
  await go("/admin/users");
  await page.getByRole("row", { name: /عميل تجريبي/ }).getByRole("button", { name: /إدارة/ }).click();
  await page.getByRole("button", { name: /^تمديد$/ }).click();
  await page.waitForTimeout(400);
  ok("Admin extended trial", await vis(page.getByText(/تم تمديد التجربة/).first()));
  await page.keyboard.press("Escape");
  await go("/admin/academy");
  ok("Admin academy shows courses", (await page.getByText(/إدارة المشاريع الاحترافية/).count()) > 0);
  await go("/dashboard"); await signOut();

  // 12. Client accepts quote and records payment
  await login("client@eltezam.test");
  await go("/dashboard/notifications");
  ok("Client received notifications", (await page.getByText(/وصلك عرض سعر/).count()) > 0);
  await page.goto(projectUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /الموافقة على العرض/ }).click();
  await page.waitForTimeout(500);
  await page.getByLabel(/رقم العملية/).fill("TRX-1001");
  await page.getByRole("button", { name: /^تسجيل الدفعة$/ }).click();
  await page.waitForTimeout(500);
  ok("Payment recorded as pending", await vis(page.getByText(/بانتظار تأكيد الإدارة/).first()));
  await signOut();

  // 13. Admin confirms payment → project approved
  await login("admin@eltezam.test");
  await go("/admin/payments");
  await page.getByRole("button", { name: /^تأكيد$/ }).first().click();
  await page.waitForTimeout(500);
  await go(`/admin/projects/${pid}`);
  ok("Payment confirmation approves project", (await page.getByText("معتمد").count()) > 0);
  // admin uploads final file → delivered
  writeFileSync(`${OUT}/final.pdf`, "%PDF-1.4 demo");
  await page.locator("select").filter({ hasText: /نسخة معاينة/ }).selectOption("final");
  await page.locator('input[type="file"]').last().setInputFiles(`${OUT}/final.pdf`);
  await page.getByRole("button", { name: /^رفع$/ }).click();
  await page.waitForTimeout(800);
  ok("Final file uploaded → delivered", (await page.getByText("تم التسليم").count()) > 0);
  await signOut();

  // 14. Trial expiry blocks premium actions (server-time field simulated in the local DB)
  await login("client@eltezam.test");
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("eltezam:local-db:v1"));
    db.profiles.forEach((p) => { if (p.role === "client") p.trial_ends_at = new Date(Date.now() - 60000).toISOString(); });
    localStorage.setItem("eltezam:local-db:v1", JSON.stringify(db));
  });
  await go("/dashboard");
  ok("Trial-ended message shown", await vis(page.getByText(/انتهت تجربتك المجانية في التزام/)));
  await page.screenshot({ path: `${OUT}/trial-ended.png` });
  await go("/services/websites");
  ok("Requests disabled after trial", await vis(page.getByText(/لا يمكن إرسال طلبات جديدة/)));

  // 15. Mobile
  const m = await browser.newContext({ ...devices["iPhone 13"] });
  const mp = await m.newPage();
  await mp.goto(BASE + "/", { waitUntil: "networkidle" });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("Mobile: no horizontal overflow", overflow <= 1, `overflow=${overflow}px`);
  await mp.getByRole("button", { name: "menu" }).click();
  ok("Mobile menu opens", await vis(mp.getByRole("navigation", { name: "mobile" })));
  await mp.screenshot({ path: `${OUT}/home-mobile.png` });
  await mp.goto(BASE + "/cv-studio", { waitUntil: "networkidle" });
  const overflow2 = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok("Mobile CV Studio: no horizontal overflow", overflow2 <= 1, `overflow=${overflow2}px`);
  await m.close();

  ok("No uncaught JS errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  ok("E2E run completed without exception", false, e.message.split("\n")[0]);
  await page.screenshot({ path: `${OUT}/failure.png` }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  process.exit(failed ? 1 : 0);
}
