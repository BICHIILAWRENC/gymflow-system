import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export default function SessionHistoryTab() {
  const { memberId } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) return;
    supabase
      .from('sessions')
      .select('*')
      .eq('member_id', memberId)
      .order('session_date', { ascending: false })
      .then(({ data }) => {
        setSessions(data || []);
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

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No sessions recorded yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-3 text-muted-foreground font-medium">Date</th>
            <th className="text-left p-3 text-muted-foreground font-medium">Time</th>
            <th className="text-left p-3 text-muted-foreground font-medium">Sauna</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sessions.map(s => (
            <tr key={s.id}>
              <td className="p-3 text-foreground">
                {format(new Date(s.session_date), 'dd MMM yyyy')}
              </td>
              <td className="p-3 tabular-nums text-foreground">
                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              </td>
              <td className="p-3">
                {s.sauna ? `🔥 ${s.sauna_duration}min` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
