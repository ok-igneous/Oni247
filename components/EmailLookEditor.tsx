import { Input } from "./Input";
import { Switch } from "./Switch";
import { Textarea } from "./Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import type { EmailTemplate } from "../helpers/emailTemplate";
import styles from "./EmailWorkspace.module.css";

/** The controls for how an email looks. Used for the default look and for a single email. */
export function EmailLookEditor({ value, onChange, idPrefix = "look" }: { value: EmailTemplate; onChange: (patch: Partial<EmailTemplate>) => void; idPrefix?: string }) {
  return (
    <div className={styles.stack}>
      <div className={styles.two}>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-accent`}>Brand colour</label>
          <input id={`${idPrefix}-accent`} className={styles.color} type="color" value={value.accent} onChange={(e) => onChange({ accent: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label>Greeting</label>
          <Select value={value.greeting} onValueChange={(v) => onChange({ greeting: v as EmailTemplate["greeting"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="first_name">Hi, and the person's first name</SelectItem>
              <SelectItem value="hello">Hello</SelectItem>
              <SelectItem value="none">No greeting</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className={styles.switches}>
        <label className={styles.switchRow}><Switch checked={value.showLogo} onCheckedChange={(v) => onChange({ showLogo: v })} /> Show my logo</label>
        <label className={styles.switchRow}><Switch checked={value.showAddress} onCheckedChange={(v) => onChange({ showAddress: v })} /> Show my address</label>
        <label className={styles.switchRow}><Switch checked={value.showPhone} onCheckedChange={(v) => onChange({ showPhone: v })} /> Show my phone</label>
        <label className={styles.switchRow}><Switch checked={value.showWhatsapp} onCheckedChange={(v) => onChange({ showWhatsapp: v })} /> Show my WhatsApp</label>
        <label className={styles.switchRow}><Switch checked={value.showWebsite} onCheckedChange={(v) => onChange({ showWebsite: v })} /> Show my website link</label>
      </div>
      <div className={styles.two}>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-btn-label`}>Button text (optional)</label>
          <Input id={`${idPrefix}-btn-label`} value={value.buttonLabel} maxLength={40} placeholder="Shop now" onChange={(e) => onChange({ buttonLabel: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-btn-url`}>Button link</label>
          <Input id={`${idPrefix}-btn-url`} value={value.buttonUrl} placeholder="https://" onChange={(e) => onChange({ buttonUrl: e.target.value })} />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-pre`}>Preview line (optional)</label>
        <Input id={`${idPrefix}-pre`} value={value.preheader} maxLength={120} placeholder="Shown next to the subject in the inbox" onChange={(e) => onChange({ preheader: e.target.value })} />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-sig`}>Sign-off (optional)</label>
        <Textarea id={`${idPrefix}-sig`} rows={2} maxLength={300} value={value.signature} placeholder={"Thank you,\nThe team"} onChange={(e) => onChange({ signature: e.target.value })} />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-foot`}>Footer note (optional)</label>
        <Textarea id={`${idPrefix}-foot`} rows={2} maxLength={300} value={value.footerNote} placeholder="For example your opening hours" onChange={(e) => onChange({ footerNote: e.target.value })} />
      </div>
    </div>
  );
}
