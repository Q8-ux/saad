import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
let source = await readFile(path, "utf8");
const original = source;

function patch(oldText, newText, marker) {
  if (source.includes(newText)) return;
  if (!source.includes(oldText)) {
    throw new Error(`Render source patch failed: ${marker}`);
  }
  source = source.replace(oldText, newText);
}

source = source.replaceAll(
  "event.currentTarget.reset();",
  '(event.target as HTMLFormElement).reset();',
);

patch(
`type OfficeMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ActiveOffice["role"];
  status: "active" | "inactive";
  createdAt: string;
};`,
`type OfficeMember = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: ActiveOffice["role"];
  status: "active" | "inactive";
  username: string;
  hasPassword: number;
  createdAt: string;
};`,
"OfficeMember credential fields",
);

patch(
`              canManageMembers={roleCan(activeOffice.role, "manageMembers")}
            />`,
`              canManageMembers={roleCan(activeOffice.role, "manageMembers")}
              canManageCredentials={activeOffice.role === "owner"}
            />`,
"SettingsPage credential permission",
);

patch(
`  canManageSettings,
  canManageMembers,
}: {
  office: OfficeData;`,
`  canManageSettings,
  canManageMembers,
  canManageCredentials,
}: {
  office: OfficeData;`,
"SettingsPage credential prop destructure",
);

patch(
`  canManageSettings: boolean;
  canManageMembers: boolean;
}) {`,
`  canManageSettings: boolean;
  canManageMembers: boolean;
  canManageCredentials: boolean;
}) {`,
"SettingsPage credential prop type",
);

patch(
`      <MembersPanel canManage={canManageMembers} onToast={onToast} />`,
`      <MembersPanel canManage={canManageMembers} canManageCredentials={canManageCredentials} onToast={onToast} />`,
"MembersPanel credential prop",
);

patch(
`function MembersPanel({
  canManage,
  onToast,
}: {
  canManage: boolean;
  onToast: (message: string) => void;
}) {`,
`function MembersPanel({
  canManage,
  canManageCredentials,
  onToast,
}: {
  canManage: boolean;
  canManageCredentials: boolean;
  onToast: (message: string) => void;
}) {`,
"MembersPanel signature",
);

patch(
`            displayName: form.get("displayName"),
            email: form.get("email"),
            role: form.get("role"),`,
`            displayName: form.get("displayName"),
            email: form.get("email"),
            username: canManageCredentials ? form.get("username") : "",
            password: canManageCredentials ? form.get("password") : "",
            role: form.get("role"),`,
"member credential payload",
);

patch(
`          <VoiceInput name="displayName" maxLength={180} placeholder={t("اسم العضو")}/>
          <VoiceInput name="email" type="email" required maxLength={180} placeholder={t("البريد الإلكتروني للعضو")}/>
          <select name="role" defaultValue="lawyer">`,
`          <VoiceInput name="displayName" maxLength={180} placeholder={t("اسم العضو")}/>
          <VoiceInput name="email" type="email" required maxLength={180} placeholder={t("البريد الإلكتروني للعضو")}/>
          {canManageCredentials && (
            <>
              <VoiceInput name="username" required minLength={3} maxLength={80} autoComplete="off" placeholder={t("اسم المستخدم للدخول")}/>
              <input name="password" type="password" required minLength={8} maxLength={512} autoComplete="new-password" placeholder={t("كلمة المرور الأولية")}/>
            </>
          )}
          <select name="role" defaultValue="lawyer">`,
"member create credential inputs",
);

patch(
`            <thead><tr><th>{t("الاسم")}</th><th>{t("البريد")}</th><th>{t("الدور")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>
            <tbody>
              {members.map((member) => (
                <MemberRow key={\`${member.id}:${member.role}:${member.status}\`} member={member} canManage={canManage} onChanged={loadMembers} onToast={onToast} />
              ))}`,
`            <thead><tr><th>{t("الاسم")}</th><th>{t("البريد")}</th>{canManageCredentials && <><th>{t("اسم المستخدم")}</th><th>{t("كلمة المرور")}</th></>}<th>{t("الدور")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>
            <tbody>
              {members.map((member) => (
                <MemberRow key={\`${member.id}:${member.role}:${member.status}:${member.username}:${member.hasPassword}\`} member={member} canManage={canManage} canManageCredentials={canManageCredentials} onChanged={loadMembers} onToast={onToast} />
              ))}`,
"member credential table columns",
);

patch(
`function MemberRow({
  member,
  canManage,
  onChanged,
  onToast,
}: {
  member: OfficeMember;
  canManage: boolean;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {`,
`function MemberRow({
  member,
  canManage,
  canManageCredentials,
  onChanged,
  onToast,
}: {
  member: OfficeMember;
  canManage: boolean;
  canManageCredentials: boolean;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {`,
"MemberRow credential prop",
);

patch(
`  const [saving, setSaving] = useState(false);
  const canEdit = canManage && member.role !== "owner";

  async function save() {`,
`  const [saving, setSaving] = useState(false);
  const [credentialUsername, setCredentialUsername] = useState(member.username || "");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const canEdit = canManage && member.role !== "owner";

  async function resetCredentials() {
    if (!canManageCredentials || credentialUsername.trim().length < 3 || newPassword.length < 8) return;
    setSavingPassword(true);
    try {
      const response = await readJson<{ message?: string }>(
        await fetch("/api/office/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resetPassword",
            id: member.id,
            username: credentialUsername,
            password: newPassword,
          }),
        }),
      );
      setNewPassword("");
      onToast(t(response.message || "تم تعيين كلمة المرور الجديدة."));
      await onChanged();
    } catch (error) {
      onToast(t(error instanceof Error ? error.message : "تعذّر تعيين كلمة المرور."));
    } finally {
      setSavingPassword(false);
    }
  }

  async function save() {`,
"MemberRow reset credential action",
);

patch(
`      <td data-label={t("البريد")}>{member.email}</td>
      <td data-label={t("الدور")}>`,
`      <td data-label={t("البريد")}>{member.email}</td>
      {canManageCredentials && (
        <>
          <td data-label={t("اسم المستخدم")}>
            <input
              value={credentialUsername}
              onChange={(event) => setCredentialUsername(event.target.value)}
              minLength={3}
              maxLength={80}
              autoComplete="off"
              aria-label={t("اسم المستخدم")}
            />
          </td>
          <td data-label={t("كلمة المرور")}>
            <div className="row-actions">
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                maxLength={512}
                autoComplete="new-password"
                placeholder={member.hasPassword ? t("كلمة مرور جديدة") : t("إنشاء كلمة مرور")}
                aria-label={t("كلمة المرور")}
              />
              <button
                type="button"
                className="small-button"
                disabled={savingPassword || credentialUsername.trim().length < 3 || newPassword.length < 8}
                onClick={() => void resetCredentials()}
              >
                {t(savingPassword ? "جارٍ الحفظ..." : member.hasPassword ? "إعادة تعيين" : "إنشاء")}
              </button>
            </div>
          </td>
        </>
      )}
      <td data-label={t("الدور")}>`,
"MemberRow credential cells",
);

if (source !== original) {
  await writeFile(path, source, "utf8");
  console.log("Applied Render source compatibility and owner credential-management patches.");
} else {
  console.log("Render source patches already applied or not required.");
}
