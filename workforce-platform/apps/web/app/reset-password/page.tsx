import PasswordActionForm from '../components/PasswordActionForm';

export default function ResetPasswordPage() {
  return <PasswordActionForm endpoint="reset-password" title="تعيين كلمة مرور جديدة" description="أدخل كلمة مرور جديدة لحسابك. الرابط صالح للاستخدام مرة واحدة." buttonLabel="حفظ كلمة المرور" />;
}
