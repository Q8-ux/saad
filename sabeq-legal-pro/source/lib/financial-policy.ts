import { RequestValidationError } from "./request-security.ts";
export type FinancialInvoice={amountFils:number;paidFils?:number;status:string;dueDate:string};
export function normalizePayment(amount:number,status:string,paid:unknown) {
 const value=status==='paid'?amount:Number(paid??0);
 if(!Number.isSafeInteger(value)||value<0||value>amount)throw new RequestValidationError("المدفوع يجب أن يكون بين صفر وقيمة الفاتورة.");
 if((status==='draft'||status==='cancelled')&&value!==0)throw new RequestValidationError("لا يمكن إلغاء أو تحويل فاتورة مدفوعة إلى مسودة دون تسوية المدفوعات.");
 if(status==='partially_paid'&&(value<=0||value>=amount))throw new RequestValidationError("الدفع الجزئي يجب أن يكون أكبر من صفر وأقل من قيمة الفاتورة.");
 if(!['paid','partially_paid'].includes(status)&&value>0)throw new RequestValidationError("اختر حالة مدفوعة أو مدفوعة جزئياً عند تسجيل دفعة.");
 return value;
}
export function paidAmount(i:FinancialInvoice){return i.status==='paid'?i.amountFils:i.paidFils??0;}
export function invoiceState(i:FinancialInvoice,today:string){if(['cancelled','draft','paid'].includes(i.status))return i.status;return i.dueDate&&i.dueDate<today&&paidAmount(i)<i.amountFils?'overdue':i.status;}
export function financialSummary(invoices:FinancialInvoice[],today:string){return invoices.reduce((s,i)=>{if(i.status==='cancelled'||i.status==='draft')return s;const paid=paidAmount(i);const due=Math.max(0,i.amountFils-paid);s.total+=i.amountFils;s.paid+=paid;s.outstanding+=due;if(invoiceState(i,today)==='overdue')s.overdue+=due;return s;},{total:0,paid:0,outstanding:0,overdue:0});}
