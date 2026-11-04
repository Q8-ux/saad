-- Oman Fruits commerce: least-privilege hardening. Apply as DB owner.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.customers,public.customer_phones,public.customer_addresses,
  public.orders,public.order_items,public.payments,public.order_status_history,
  public.audit_logs,public.journal_entries,public.journal_lines,
  public.accounts,public.expenses,public.cash_movements,public.purchases,
  public.purchase_items,public.supplier_payments,public.suppliers,
  public.stock_adjustments,public.variant_costs FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.customers,public.customer_phones,public.customer_addresses,
 public.orders,public.order_items,public.payments,public.order_status_history,
 public.audit_logs,public.journal_entries,public.journal_lines,
 public.accounts,public.expenses,public.cash_movements,public.purchases,
 public.purchase_items,public.supplier_payments,public.stock_adjustments TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.suppliers,public.variant_costs TO authenticated;
GRANT SELECT ON TABLE public.categories,public.products,public.product_variants,public.settings TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON TABLE public.categories,public.products,public.product_variants TO authenticated;
REVOKE EXECUTE ON FUNCTION public._require_staff(),public._require_manager(),public._cash_acct(text),
 public.phone_guard(),public.variant_guard() FROM PUBLIC,anon;
COMMIT;
