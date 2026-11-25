import { memoContactCopy } from "@/lib/memo-contact";

export default function MemoContactFields({ language, email, phone, disabled, onChange }: {
  language: "ar" | "en" | "ur"; email: string; phone: string; disabled: boolean;
  onChange: (field: "contactEmail" | "contactPhone", value: string) => void;
}) {
  const copy = memoContactCopy[language];
  return <fieldset className="memo-contact-fields" disabled={disabled}>
    <legend>{copy.title}</legend><p id="memo-contact-hint">{copy.hint}</p>
    <div className="form-grid">
      <label className="field"><span>{copy.phone} *</span><input name="contactPhone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required maxLength={60} value={phone} onChange={event => onChange("contactPhone", event.target.value)} aria-describedby="memo-contact-hint" /></label>
      <label className="field"><span>{copy.email} *</span><input name="contactEmail" type="email" inputMode="email" autoComplete="email" dir="ltr" required maxLength={254} value={email} onChange={event => onChange("contactEmail", event.target.value)} aria-describedby="memo-contact-hint" /></label>
    </div>
  </fieldset>;
}
