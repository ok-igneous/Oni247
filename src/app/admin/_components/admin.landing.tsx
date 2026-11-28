"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Palette, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Textarea } from "../../../../components/Textarea";
import { Switch } from "../../../../components/Switch";
import { Skeleton } from "../../../../components/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/Select";
import { Field, Fields, PageHead, Panel } from "../../../../components/Panel";
import { SectionLayout, useSection, type SectionItem } from "../../../../components/SectionLayout";
import { DEFAULT_LANDING, ICON_NAMES, type IconName, type Landing, type LandingItem } from "../../../../helpers/landingConfig";
import { getLanding } from "../../../../endpoints/landing_GET.schema";
import { postAdminLanding } from "../../../../endpoints/admin/landing_POST.schema";
import styles from "./admin.landing.module.css";

const SECTIONS: SectionItem[] = [
  { id: "look", label: "Colours and fonts", hint: "The look of the whole page", icon: <Palette size={15} /> },
  { id: "hero", label: "Header and hero", hint: "Menu, headline, buttons" },
  { id: "features", label: "Highlights", hint: "Trust strip and feature cards" },
  { id: "how", label: "How it works", hint: "Steps and who it is for" },
  { id: "pricing", label: "Pricing", hint: "Shown from your live plans" },
  { id: "cta", label: "Closing call and footer", hint: "Last push to sign up" },
  { id: "seo", label: "Search and sharing", hint: "Title and description" },
];

const FONTS = [
  { label: "Inter Tight", value: "Inter Tight, sans-serif" },
  { label: "Bricolage Grotesque", value: "Bricolage Grotesque, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, serif" },
  { label: "System default", value: "system-ui, sans-serif" },
];

type Setter = (next: Landing) => void;

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className={styles.toggle}><Switch checked={checked} onCheckedChange={onChange} /><span>{label}</span></label>
);

const Color = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className={styles.color}>
    <span>{label}</span>
    <div className={styles.colorRow}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      <Input value={value} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)} className={styles.hex} />
    </div>
  </label>
);

const FontSelect = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Field label={label}>
    <Select value={FONTS.some((f) => f.value === value) ? value : FONTS[0].value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{FONTS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
    </Select>
  </Field>
);

const Items = ({ title, items, onChange, max }: { title: string; items: LandingItem[]; onChange: (i: LandingItem[]) => void; max: number }) => (
  <div className={styles.items}>
    <div className={styles.itemsHead}><strong>{title}</strong><Button size="sm" variant="outline" disabled={items.length >= max} onClick={() => onChange([...items, { icon: "Sparkles", title: "New item", text: "" }])}><Plus size={13} /> Add</Button></div>
    {items.map((it, i) => (
      <div key={i} className={styles.itemRow}>
        <Select value={it.icon} onValueChange={(v) => onChange(items.map((x, j) => (j === i ? { ...x, icon: v as IconName } : x)))}>
          <SelectTrigger className={styles.iconSelect} aria-label="Icon"><SelectValue /></SelectTrigger>
          <SelectContent>{ICON_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={it.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Title" />
        <Textarea rows={2} value={it.text} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Short text" className={styles.itemText} />
        <Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
      </div>
    ))}
  </div>
);

const Editor = ({ initial }: { initial: Landing }) => {
  const queryClient = useQueryClient();
  const [section, setSection] = useSection(SECTIONS);
  const [L, setLanding] = useState<Landing>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const set: Setter = (next) => {
    setLanding(next);
    setDirty(true);
  };
  const theme = (patch: Partial<Landing["theme"]>) => set({ ...L, customTheme: true, theme: { ...L.theme, ...patch } });

  const save = async () => {
    setSaving(true);
    try {
      const res = await postAdminLanding({ op: "save", landing: L as unknown as Record<string, unknown> });
      setLanding(res.landing);
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["landing"] });
      toast.success("Landing page saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };
  const reset = async () => {
    if (!window.confirm("Put the landing page back to the original wording and colours? Your edits will be lost.")) return;
    try {
      const res = await postAdminLanding({ op: "reset" });
      setLanding(res.landing);
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["landing"] });
      toast.success("Landing page restored.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset.");
    }
  };

  return (
    <>
      <SectionLayout
        title="Landing page"
        items={SECTIONS}
        value={section}
        onChange={setSection}
        footer={<Button size="sm" variant="outline" onClick={() => window.open("/?preview=1", "_blank", "noopener")}><ExternalLink size={13} /> View page</Button>}
      >
        {section === "look" && (
          <Panel title="Colours and fonts" desc="Uses the same theme engine as shop sites. Leave it alone to keep the original look." actions={<Toggle label="Use my colours" checked={L.customTheme} onChange={(v) => set({ ...L, customTheme: v })} />}>
            <div className={styles.colors}>
              <Color label="Main colour" value={L.theme.primaryColor} onChange={(v) => theme({ primaryColor: v, buttonBackground: v })} />
              <Color label="Accent colour" value={L.theme.accentColor} onChange={(v) => theme({ accentColor: v })} />
              <Color label="Page background" value={L.theme.backgroundColor} onChange={(v) => theme({ backgroundColor: v })} />
              <Color label="Cards" value={L.theme.cardBackground} onChange={(v) => theme({ cardBackground: v })} />
              <Color label="Text" value={L.theme.textColor} onChange={(v) => theme({ textColor: v })} />
              <Color label="Soft text" value={L.theme.mutedTextColor} onChange={(v) => theme({ mutedTextColor: v })} />
              <Color label="Borders" value={L.theme.borderColor} onChange={(v) => theme({ borderColor: v })} />
              <Color label="Button text" value={L.theme.buttonTextColor} onChange={(v) => theme({ buttonTextColor: v })} />
            </div>
            <Fields>
              <FontSelect label="Headings font" value={L.theme.displayFontFamily} onChange={(v) => theme({ displayFontFamily: v })} />
              <FontSelect label="Body font" value={L.theme.fontFamily} onChange={(v) => theme({ fontFamily: v })} />
              <Field label="Heading weight">
                <Select value={L.theme.headingWeight} onValueChange={(v) => theme({ headingWeight: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["500", "600", "700", "800"].map((w) => <SelectItem key={w} value={w}>{w === "800" ? "Extra bold" : w === "700" ? "Bold" : w === "600" ? "Semi bold" : "Medium"}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Corner roundness">
                <Select value={L.theme.cardRadius} onValueChange={(v) => theme({ cardRadius: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[["0px", "Square"], ["6px", "Slight"], ["10px", "Rounded"], ["16px", "Very rounded"], ["24px", "Soft"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </Fields>
            <div className={styles.swatch} style={{ background: L.theme.backgroundColor, color: L.theme.textColor, borderColor: L.theme.borderColor, borderRadius: L.theme.cardRadius, fontFamily: L.theme.fontFamily }}>
              <strong style={{ fontFamily: L.theme.displayFontFamily, fontWeight: Number(L.theme.headingWeight) }}>{L.hero.headline}</strong>
              <span style={{ color: L.theme.mutedTextColor }}>{L.hero.sub.slice(0, 90)}…</span>
              <span className={styles.swatchBtn} style={{ background: L.theme.primaryColor, color: L.theme.buttonTextColor, borderRadius: L.theme.cardRadius }}>{L.hero.primaryCta}</span>
            </div>
          </Panel>
        )}

        {section === "hero" && (
          <>
            <Panel title="Header" desc="The name and menu at the top.">
              <Fields>
                <Field label="Brand name"><Input value={L.brand.name} onChange={(e) => set({ ...L, brand: { ...L.brand, name: e.target.value } })} /></Field>
                <Field label="Login button"><Input value={L.nav.login} onChange={(e) => set({ ...L, nav: { ...L.nav, login: e.target.value } })} /></Field>
                <Field label="Features menu label"><Input value={L.nav.features} onChange={(e) => set({ ...L, nav: { ...L.nav, features: e.target.value } })} /></Field>
                <Field label="How it works menu label"><Input value={L.nav.how} onChange={(e) => set({ ...L, nav: { ...L.nav, how: e.target.value } })} /></Field>
                <Field label="Pricing menu label"><Input value={L.nav.pricing} onChange={(e) => set({ ...L, nav: { ...L.nav, pricing: e.target.value } })} /></Field>
              </Fields>
            </Panel>
            <Panel title="Hero" desc="The first thing visitors read." actions={<Toggle label="Show" checked={L.hero.enabled} onChange={(v) => set({ ...L, hero: { ...L.hero, enabled: v } })} />}>
              <Fields>
                <Field label="Small line above the headline"><Input value={L.hero.eyebrow} onChange={(e) => set({ ...L, hero: { ...L.hero, eyebrow: e.target.value } })} /></Field>
                <Field label="Note under the buttons"><Input value={L.hero.trialNote} onChange={(e) => set({ ...L, hero: { ...L.hero, trialNote: e.target.value } })} /></Field>
                <Field label="Headline" full><Textarea rows={2} value={L.hero.headline} onChange={(e) => set({ ...L, hero: { ...L.hero, headline: e.target.value } })} /></Field>
                <Field label="Supporting text" full><Textarea rows={3} value={L.hero.sub} onChange={(e) => set({ ...L, hero: { ...L.hero, sub: e.target.value } })} /></Field>
                <Field label="Main button"><Input value={L.hero.primaryCta} onChange={(e) => set({ ...L, hero: { ...L.hero, primaryCta: e.target.value } })} /></Field>
                <Field label="Second button"><Input value={L.hero.secondaryCta} onChange={(e) => set({ ...L, hero: { ...L.hero, secondaryCta: e.target.value } })} /></Field>
              </Fields>
              <Toggle label="Show the sample shop preview" checked={L.hero.showPreview} onChange={(v) => set({ ...L, hero: { ...L.hero, showPreview: v } })} />
            </Panel>
          </>
        )}

        {section === "features" && (
          <>
            <Panel title="Trust strip" desc="A short row of reassurances under the hero." actions={<Toggle label="Show" checked={L.trust.enabled} onChange={(v) => set({ ...L, trust: { ...L.trust, enabled: v } })} />}>
              <Fields>
                <Field label="Lead-in text" full><Input value={L.trust.text} onChange={(e) => set({ ...L, trust: { ...L.trust, text: e.target.value } })} /></Field>
                <Field label="Items (one per line, up to 6)" full><Textarea rows={4} value={L.trust.items.join("\n")} onChange={(e) => set({ ...L, trust: { ...L.trust, items: e.target.value.split("\n").slice(0, 6) } })} /></Field>
              </Fields>
            </Panel>
            <Panel title="Feature cards" actions={<Toggle label="Show" checked={L.features.enabled} onChange={(v) => set({ ...L, features: { ...L.features, enabled: v } })} />}>
              <Fields>
                <Field label="Small heading"><Input value={L.features.kicker} onChange={(e) => set({ ...L, features: { ...L.features, kicker: e.target.value } })} /></Field>
                <Field label="Title"><Input value={L.features.title} onChange={(e) => set({ ...L, features: { ...L.features, title: e.target.value } })} /></Field>
                <Field label="Introduction" full><Textarea rows={2} value={L.features.intro} onChange={(e) => set({ ...L, features: { ...L.features, intro: e.target.value } })} /></Field>
              </Fields>
              <Items title="Cards" items={L.features.items} max={12} onChange={(items) => set({ ...L, features: { ...L.features, items } })} />
            </Panel>
          </>
        )}

        {section === "how" && (
          <>
            <Panel title="How it works" actions={<Toggle label="Show" checked={L.how.enabled} onChange={(v) => set({ ...L, how: { ...L.how, enabled: v } })} />}>
              <Fields>
                <Field label="Small heading"><Input value={L.how.kicker} onChange={(e) => set({ ...L, how: { ...L.how, kicker: e.target.value } })} /></Field>
                <Field label="Title"><Input value={L.how.title} onChange={(e) => set({ ...L, how: { ...L.how, title: e.target.value } })} /></Field>
                <Field label="Text" full><Textarea rows={3} value={L.how.text} onChange={(e) => set({ ...L, how: { ...L.how, text: e.target.value } })} /></Field>
              </Fields>
              <div className={styles.items}>
                <div className={styles.itemsHead}><strong>Steps</strong><Button size="sm" variant="outline" disabled={L.how.steps.length >= 8} onClick={() => set({ ...L, how: { ...L.how, steps: [...L.how.steps, { title: "New step", text: "" }] } })}><Plus size={13} /> Add</Button></div>
                {L.how.steps.map((s, i) => (
                  <div key={i} className={styles.stepRow}>
                    <span className={styles.stepNo}>{String(i + 1).padStart(2, "0")}</span>
                    <Input value={s.title} onChange={(e) => set({ ...L, how: { ...L.how, steps: L.how.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) } })} placeholder="Step title" />
                    <Input value={s.text} onChange={(e) => set({ ...L, how: { ...L.how, steps: L.how.steps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) } })} placeholder="Short text" />
                    <Button size="icon-sm" variant="ghost" aria-label="Remove step" onClick={() => set({ ...L, how: { ...L.how, steps: L.how.steps.filter((_, j) => j !== i) } })}><Trash2 size={14} /></Button>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Who it is for" actions={<Toggle label="Show" checked={L.audience.enabled} onChange={(v) => set({ ...L, audience: { ...L.audience, enabled: v } })} />}>
              <Fields>
                <Field label="Small heading"><Input value={L.audience.kicker} onChange={(e) => set({ ...L, audience: { ...L.audience, kicker: e.target.value } })} /></Field>
                <Field label="Title"><Input value={L.audience.title} onChange={(e) => set({ ...L, audience: { ...L.audience, title: e.target.value } })} /></Field>
              </Fields>
              <Items title="Business types" items={L.audience.items} max={8} onChange={(items) => set({ ...L, audience: { ...L.audience, items } })} />
            </Panel>
          </>
        )}

        {section === "pricing" && (
          <Panel title="Pricing" desc="Plan names, prices and features come from Admin → Plans, so this section is never out of date." actions={<Toggle label="Show" checked={L.pricing.enabled} onChange={(v) => set({ ...L, pricing: { ...L.pricing, enabled: v } })} />}>
            <Fields>
              <Field label="Small heading"><Input value={L.pricing.kicker} onChange={(e) => set({ ...L, pricing: { ...L.pricing, kicker: e.target.value } })} /></Field>
              <Field label="Title"><Input value={L.pricing.title} onChange={(e) => set({ ...L, pricing: { ...L.pricing, title: e.target.value } })} /></Field>
              <Field label="Text" full><Textarea rows={3} value={L.pricing.text} onChange={(e) => set({ ...L, pricing: { ...L.pricing, text: e.target.value } })} /></Field>
            </Fields>
            <Toggle label="Show the Free plan card" checked={L.pricing.showFree} onChange={(v) => set({ ...L, pricing: { ...L.pricing, showFree: v } })} />
          </Panel>
        )}

        {section === "cta" && (
          <>
            <Panel title="Closing call to action" actions={<Toggle label="Show" checked={L.cta.enabled} onChange={(v) => set({ ...L, cta: { ...L.cta, enabled: v } })} />}>
              <Fields>
                <Field label="Small heading"><Input value={L.cta.kicker} onChange={(e) => set({ ...L, cta: { ...L.cta, kicker: e.target.value } })} /></Field>
                <Field label="Title"><Input value={L.cta.title} onChange={(e) => set({ ...L, cta: { ...L.cta, title: e.target.value } })} /></Field>
                <Field label="Text" full><Textarea rows={2} value={L.cta.text} onChange={(e) => set({ ...L, cta: { ...L.cta, text: e.target.value } })} /></Field>
                <Field label="Button"><Input value={L.cta.button} onChange={(e) => set({ ...L, cta: { ...L.cta, button: e.target.value } })} /></Field>
                <Field label="Ticks (one per line)"><Textarea rows={3} value={L.cta.checks.join("\n")} onChange={(e) => set({ ...L, cta: { ...L.cta, checks: e.target.value.split("\n").slice(0, 5) } })} /></Field>
              </Fields>
            </Panel>
            <Panel title="Footer">
              <Fields>
                <Field label="Footer line" full><Input value={L.footer.tagline} onChange={(e) => set({ ...L, footer: { tagline: e.target.value } })} /></Field>
              </Fields>
            </Panel>
          </>
        )}

        {section === "seo" && (
          <Panel title="Search and sharing" desc="What Google and social apps show for the landing page.">
            <Fields>
              <Field label="Page title" hint={`${L.seo.title.length}/70`} full><Input value={L.seo.title} maxLength={70} onChange={(e) => set({ ...L, seo: { ...L.seo, title: e.target.value } })} /></Field>
              <Field label="Description" hint={`${L.seo.description.length}/200`} full><Textarea rows={3} maxLength={200} value={L.seo.description} onChange={(e) => set({ ...L, seo: { ...L.seo, description: e.target.value } })} /></Field>
            </Fields>
          </Panel>
        )}
      </SectionLayout>

      <div className={`${styles.saveBar} ${dirty ? styles.saveBarOn : ""}`} role="status">
        <span>{dirty ? "You have unsaved changes." : <><Check size={14} /> All changes saved.</>}</span>
        <div className={styles.saveActions}>
          <Button variant="ghost" size="sm" onClick={() => void reset()}><RotateCcw size={13} /> Restore original</Button>
          <Button disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </>
  );
};

const AdminLandingPage = () => {
  const { data, isFetching, error } = useQuery({ queryKey: ["landing", "admin"], queryFn: () => getLanding(), retry: false, staleTime: 0 });
  return (
    <div className={styles.page}>
      
      <PageHead title="Landing page" lead="Edit the page visitors see at your main address: wording, sections, colours and fonts." />
      {isFetching && !data ? <Skeleton className={styles.skeleton} /> : error || !data ? <p className={styles.error}>{error instanceof Error ? error.message : "Could not load the landing page."}</p> : <Editor initial={data.landing ?? DEFAULT_LANDING} />}
    </div>
  );
};

export default AdminLandingPage;

