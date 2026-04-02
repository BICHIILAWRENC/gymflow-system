import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CreditCard } from 'lucide-react';

export default function PaymentHistoryTab() {
  const { memberId } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    supabase
      .from('payments')
      .select('*')
      .eq('member_id', memberId)
      .order('payment_date', { ascending: false })
      .then(({ data }) => {
        setPayments(data || []);
        setLoading(false);
      });
  }, [memberId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-lg" />)}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No payments yet</p>
      </div>
    );
  }

  const total = payments.reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <div>
      <div className="mb-4 p-4 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">Total Paid</span>
        <p className="text-2xl font-bold tabular-nums text-foreground">Ksh {total.toLocaleString()}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Amount</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Months</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map(p => (
              <tr key={p.id}>
                <td className="p-3 tabular-nums text-foreground">
                  {format(new Date(p.payment_date), 'dd MMM yyyy')}
                </td>
                <td className="p-3 tabular-nums font-medium text-foreground">
                  Ksh {Number(p.total_amount).toLocaleString()}
                </td>
                <td className="p-3 tabular-nums text-foreground">{p.months}</td>
                <td className="p-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground uppercase">
                    {p.payment_method}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
