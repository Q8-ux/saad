/** Shared UI/server policy. Unknown roles are denied rather than promoted. */
export type OfficeRole = "owner" | "admin" | "lawyer" | "translator" | "secretary" | "staff" | "finance" | "viewer";
export type OfficeCapability = "manageSettings" | "manageMembers" | "manageClients" | "manageCases" | "manageHearings" | "manageInvoices" | "manageMemos" | "viewClients" | "viewCases" | "viewHearings" | "viewInvoices" | "viewMemos" | "viewDocuments" | "uploadDocuments" | "approveDocuments" | "citeDocuments" | "exportDocuments" | "viewContact" | "viewAudit";
const permissions: Record<OfficeRole, readonly OfficeCapability[]> = {
  owner: ["manageSettings","manageMembers","manageClients","manageCases","manageHearings","manageInvoices","manageMemos","viewClients","viewCases","viewHearings","viewInvoices","viewMemos","viewDocuments","uploadDocuments","approveDocuments","citeDocuments","exportDocuments","viewContact","viewAudit"],
  admin: ["manageSettings","manageMembers","manageClients","manageCases","manageHearings","manageInvoices","manageMemos","viewClients","viewCases","viewHearings","viewInvoices","viewMemos","viewDocuments","uploadDocuments","approveDocuments","citeDocuments","exportDocuments","viewContact","viewAudit"],
  lawyer: ["manageClients","manageCases","manageHearings","manageMemos","viewClients","viewCases","viewHearings","viewMemos","viewDocuments","uploadDocuments","citeDocuments","exportDocuments","viewContact"],
  translator: ["viewDocuments","uploadDocuments","exportDocuments","viewContact"],
  secretary: ["manageClients","manageCases","manageHearings","viewClients","viewCases","viewHearings","viewDocuments","uploadDocuments","viewContact"],
  staff: ["manageClients","manageCases","manageHearings","viewClients","viewCases","viewHearings","viewDocuments","uploadDocuments","viewContact"],
  finance: ["manageInvoices","viewInvoices","viewContact"],
  viewer: ["viewDocuments"],
};
export function roleCan(role: string, capability: OfficeCapability): boolean {
  return Object.hasOwn(permissions, role) && permissions[role as OfficeRole].includes(capability);
}
export function canViewPage(role: string, page: string): boolean {
  const requirement: Record<string, OfficeCapability> = {clients:"viewClients",cases:"viewCases",hearings:"viewHearings",invoices:"viewInvoices",memos:"viewMemos",library:"viewDocuments",search:"viewDocuments"};
  return !requirement[page] || roleCan(role, requirement[page]);
}
