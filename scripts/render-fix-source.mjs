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
  [
    'type OfficeMember = {',
    '  id: string;',
    '  userId: string;',
    '  email: string;',
    '  displayName: string;',
    '  role: ActiveOffice["role"];',
    '  status: "active" | "inactive";',
    '  createdAt: string;',
    '};',
  ].join('\n'),
  [
    'type OfficeMember = {',
    '  id: string;',
    '  userId: string;',
    '  email: string;',
    '  displayName: string;',
    '  role: ActiveOffice["role"];',
    '  status: "active" | "inactive";',
    '  username: string;',
    '  hasPassword: number;',
    '  createdAt: string;',
    '};',
  ].join('\n'),
  'OfficeMember credential fields',
);

patch(
  '              canManageMembers={roleCan(activeOffice.role, "manageMembers")}\n            />',
  '              canManageMembers={roleCan(activeOffice.role, "manageMembers")}\n              canManageCredentials={activeOffice.role === "owner"}\n            />',
  'SettingsPage credential permission',
);

patch(
  '  canManageSettings,\n  canManageMembers,\n}: {\n  office: OfficeData;',
  '  canManageSettings,\n  canManageMembers,\n  canManageCredentials,\n}: {\n  office: OfficeData;',
  'SettingsPage credential prop destructure',
);

patch(
  '  canManageSettings: boolean;\n  canManageMembers: boolean;\n}) {',
  '  canManageSettings: boolean;\n  canManageMembers: boolean;\n  canManageCredentials: boolean;\n}) {',
  'SettingsPage credential prop type',
);

patch(
  '      <MembersPanel canManage={canManageMembers} onToast={onToast} />',
  '      <MembersPanel canManage={canManageMembers} canManageCredentials={canManageCredentials} onToast={onToast} />',
  'MembersPanel credential prop',
);

patch(
  [
    'function MembersPanel({',
    '  canManage,',
    '  onToast,',
    '}: {',
    '  canManage: boolean;',
    '  onToast: (message: string) => void;',
    '}) {',
  ].join('\n'),
  [
    'function MembersPanel({',
    '  canManage,',
    '  canManageCredentials,',
    '  onToast,',
    '}: {',
    '  canManage: boolean;',
    '  canManageCredentials: boolean;',
    '  onToast: (message: string) => void;',
    '}) {',
  ].join('\n'),
  'MembersPanel signature',
);

patch(
  '            displayName: form.get("displayName"),\n            email: form.get("email"),\n            role: form.get("role"),',
  '            displayName: form.get("displayName"),\n            email: form.get("email"),\n            username: canManageCredentials ? form.get("username") : "",\n            password: canManageCredentials ? form.get("password") : "",\n            role: form.get("role"),',
  'member credential payload',
);

patch(
  [
    '          <VoiceInput name="displayName" maxLength={180} placeholder={t("اسم العضو")}/>',
    '          <VoiceInput name="email" type="email" required maxLength={180} placeholder={t("البريد الإلكتروني للعضو")}/>',
    '          <select name="role" defaultValue="lawyer">',
  ].join('\n'),
  [
    '          <VoiceInput name="displayName" maxLength={180} placeholder={t("اسم العضو")}/>',
    '          <VoiceInput name="email" type="email" required maxLength={180} placeholder={t("البريد الإلكتروني للعضو")}/>',
    '          {canManageCredentials && (',
    '            <>',
    '              <VoiceInput name="username" required minLength={3} maxLength={80} autoComplete="off" placeholder={t("اسم المستخدم للدخول")}/>',
    '              <input name="password" type="password" required minLength={8} maxLength={512} autoComplete="new-password" placeholder={t("كلمة المرور الأولية")}/>',
    '            </>',
    '          )}',
    '          <select name="role" defaultValue="lawyer">',
  ].join('\n'),
  'member create credential inputs',
);

const oldMemberRows = [
  '            <thead><tr><th>{t("الاسم")}</th><th>{t("البريد")}</th><th>{t("الدور")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>',
  '            <tbody>',
  '              {members.map((member) => (',
  '                <MemberRow key={`${member.id}:${member.role}:${member.status}`} member={member} canManage={canManage} onChanged={loadMembers} onToast={onToast} />',
  '              ))}',
].join('\n');
const newMemberRows = [
  '            <thead><tr><th>{t("الاسم")}</th><th>{t("البريد")}</th>{canManageCredentials && <><th>{t("اسم المستخدم")}</th><th>{t("كلمة المرور")}</th></>}<th>{t("الدور")}</th><th>{t("الحالة")}</th>{canManage && <th>{t("الإجراء")}</th>}</tr></thead>',
  '            <tbody>',
  '              {members.map((member) => (',
  '                <MemberRow key={`${member.id}:${member.role}:${member.status}:${member.username}:${member.hasPassword}`} member={member} canManage={canManage} canManageCredentials={canManageCredentials} onChanged={loadMembers} onToast={onToast} />',
  '              ))}',
].join('\n');
patch(oldMemberRows, newMemberRows, 'member credential table columns');

patch(
  [
    'function MemberRow({',
    '  member,',
    '  canManage,',
    '  onChanged,',
    '  onToast,',
    '}: {',
    '  member: OfficeMember;',
    '  canManage: boolean;',
    '  onChanged: () => Promise<void>;',
    '  onToast: (message: string) => void;',
    '}) {',
  ].join('\n'),
  [
    'function MemberRow({',
    '  member,',
    '  canManage,',
    '  canManageCredentials,',
    '  onChanged,',
    '  onToast,',
    '}: {',
    '  member: OfficeMember;',
    '  canManage: boolean;',
    '  canManageCredentials: boolean;',
    '  onChanged: () => Promise<void>;',
    '  onToast: (message: string) => void;',
    '}) {',
  ].join('\n'),
  'MemberRow credential prop',
);

patch(
  '  const [saving, setSaving] = useState(false);\n  const canEdit = canManage && member.role !== "owner";\n\n  async function save() {',
  [
    '  const [saving, setSaving] = useState(false);',
    '  const [credentialUsername, setCredentialUsername] = useState(member.username || "");',
    '  const [newPassword, setNewPassword] = useState("");',
    '  const [savingPassword, setSavingPassword] = useState(false);',
    '  const canEdit = canManage && member.role !== "owner";',
    '',
    '  async function resetCredentials() {',
    '    if (!canManageCredentials || credentialUsername.trim().length < 3 || newPassword.length < 8) return;',
    '    setSavingPassword(true);',
    '    try {',
    '      const response = await readJson<{ message?: string }>(',
    '        await fetch("/api/office/members", {',
    '          method: "PATCH",',
    '          headers: { "Content-Type": "application/json" },',
    '          body: JSON.stringify({',
    '            action: "resetPassword",',
    '            id: member.id,',
    '            username: credentialUsername,',
    '            password: newPassword,',
    '          }),',
    '        }),',
    '      );',
    '      setNewPassword("");',
    '      onToast(t(response.message || "تم تعيين كلمة المرور الجديدة."));',
    '      await onChanged();',
    '    } catch (error) {',
    '      onToast(t(error instanceof Error ? error.message : "تعذّر تعيين كلمة المرور."));',
    '    } finally {',
    '      setSavingPassword(false);',
    '    }',
    '  }',
    '',
    '  async function save() {',
  ].join('\n'),
  'MemberRow reset credential action',
);

patch(
  '      <td data-label={t("البريد")}>{member.email}</td>\n      <td data-label={t("الدور")}>',
  [
    '      <td data-label={t("البريد")}>{member.email}</td>',
    '      {canManageCredentials && (',
    '        <>',
    '          <td data-label={t("اسم المستخدم")}>',
    '            <input value={credentialUsername} onChange={(event) => setCredentialUsername(event.target.value)} minLength={3} maxLength={80} autoComplete="off" aria-label={t("اسم المستخدم")} />',
    '          </td>',
    '          <td data-label={t("كلمة المرور")}>',
    '            <div className="row-actions member-password-controls">',
    '              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={512} autoComplete="new-password" placeholder={member.hasPassword ? t("كلمة مرور جديدة") : t("إنشاء كلمة مرور")} aria-label={t("كلمة المرور")} />',
    '              <button type="button" className="small-button" disabled={savingPassword || credentialUsername.trim().length < 3 || newPassword.length < 8} onClick={() => void resetCredentials()}>',
    '                {t(savingPassword ? "جارٍ الحفظ..." : member.hasPassword ? "إعادة تعيين" : "إنشاء")}',
    '              </button>',
    '            </div>',
    '          </td>',
    '        </>',
    '      )}',
    '      <td data-label={t("الدور")}>',
  ].join('\n'),
  'MemberRow credential cells',
);

if (source !== original) {
  await writeFile(path, source, "utf8");
  console.log("Applied Render source compatibility and owner credential-management patches.");
} else {
  console.log("Render source patches already applied or not required.");
}
