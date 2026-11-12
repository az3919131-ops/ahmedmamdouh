import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircle, Mail, Briefcase as Linkedin, Send, CheckCircle2 } from "lucide-react";
import { Seo } from "@/components/common/Seo";
import { PageHero } from "@/components/common/PageHero";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/contexts/LangContext";
import { useRows, useSettings } from "@/hooks/useData";
import { backend } from "@/services";
import { notifyAdmin } from "@/services/notify";
import { whatsappLink } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(100),
  email: z.string().trim().email("بريد غير صالح"),
  phone: z.string().max(30).optional(),
  subject: z.string().trim().min(3, "الموضوع مطلوب").max(150),
  service: z.string().optional(),
  kind: z.enum(["contact", "consultation", "quote"]),
  message: z.string().trim().min(10, "اكتب رسالة أوضح").max(4000),
  website: z.string().max(0).optional(), // honeypot
});

export default function Contact() {
  const { tr, pick } = useLang();
  const { get } = useSettings();
  const services = useRows("services", { order: { column: "sort_order" } });
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { kind: "contact" } });
  const wa = whatsappLink(get<string>("whatsapp_number", ""), tr("مرحبًا م. أحمد، أريد شرح فكرتي", "Hello Eng. Ahmed, I'd like to explain my idea"));
  const email = get<string>("contact_email", "");
  const social = get<Record<string, string>>("social_links", {});

  const submit = form.handleSubmit(async (v) => {
    if (v.website) return;
    try {
      await backend.insert("contact_messages", { name: v.name, email: v.email, phone: v.phone || null, subject: v.subject, service: v.service || null, kind: v.kind, message: v.message });
      await notifyAdmin("contact", { name: v.name, subject: v.subject, kind: v.kind });
      setSent(true); form.reset();
    } catch (e) { toast.error((e as Error).message); }
  });
  const err = form.formState.errors;

  return (
    <>
      <Seo title={tr("تواصل معنا", "Contact")} />
      <PageHero title={tr("تواصل معنا", "Contact us")} text={tr("تواصل مباشرة مع المهندس أحمد زهران لشرح فكرتك والحصول على الحل المناسب.", "Talk directly with Eng. Ahmed Zahran about your idea and get the right solution.")} crumbs={[{ label: tr("الرئيسية", "Home"), to: "/" }, { label: tr("تواصل معنا", "Contact") }]} />
      <section className="py-14">
        <div className="container-x grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "success", size: "lg", className: "w-full" })}><MessageCircle className="h-5 w-5" />{tr("تواصل عبر واتساب", "WhatsApp")}</a>
              : <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">{tr("استخدم نموذج التواصل وسنرد عليك في أقرب وقت.", "Use the contact form and we’ll get back to you soon.")}</p>}
            {email && <a href={`mailto:${email}`} className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}><Mail className="h-5 w-5" />{email}</a>}
            {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}><Linkedin className="h-5 w-5" />LinkedIn</a>}
          </div>
          <Card className="p-5 sm:p-7 lg:col-span-2">
            {sent ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                <p className="mt-4 text-xl font-bold text-navy">{tr("تم استلام رسالتك بنجاح", "Your message was received")}</p>
                <p className="mt-2 text-slate-600">{tr("سيتواصل معك فريق التزام قريبًا.", "The ELTEZAM team will contact you soon.")}</p>
                <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>{tr("إرسال رسالة أخرى", "Send another")}</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
                <input type="text" tabIndex={-1} autoComplete="off" className="hidden" {...form.register("website")} />
                <Field label={tr("الاسم", "Name")} required error={err.name?.message}><Input {...form.register("name")} autoComplete="name" /></Field>
                <Field label={tr("البريد الإلكتروني", "Email")} required error={err.email?.message}><Input type="email" dir="ltr" {...form.register("email")} autoComplete="email" /></Field>
                <Field label={tr("الهاتف", "Phone")}><Input dir="ltr" {...form.register("phone")} autoComplete="tel" /></Field>
                <Field label={tr("نوع الطلب", "Request type")}>
                  <Select {...form.register("kind")}><option value="contact">{tr("رسالة عامة", "General message")}</option><option value="consultation">{tr("طلب استشارة", "Consultation")}</option><option value="quote">{tr("طلب عرض سعر", "Quote request")}</option></Select>
                </Field>
                <Field label={tr("الموضوع", "Subject")} required error={err.subject?.message}><Input {...form.register("subject")} /></Field>
                <Field label={tr("نوع الخدمة", "Service")}>
                  <Select {...form.register("service")}><option value="">—</option>{(services.data ?? []).map((s) => <option key={s.id} value={s.slug}>{pick(s.name, s.name_en)}</option>)}</Select>
                </Field>
                <Field label={tr("الرسالة", "Message")} required error={err.message?.message} className="sm:col-span-2"><Textarea rows={6} {...form.register("message")} /></Field>
                <div className="sm:col-span-2"><Button type="submit" size="lg" loading={form.formState.isSubmitting}><Send className="h-5 w-5" />{tr("إرسال", "Send")}</Button></div>
              </form>
            )}
          </Card>
        </div>
      </section>
    </>
  );
}
