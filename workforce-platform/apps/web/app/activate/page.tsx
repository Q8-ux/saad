import PasswordActionForm from '../components/PasswordActionForm';

export default function ActivatePage() {
  return <PasswordActionForm endpoint="activate" title="تفعيل الحساب" description="حدد كلمة مرور قوية لإكمال تفعيل حسابك." buttonLabel="تفعيل الحساب" />;
}
