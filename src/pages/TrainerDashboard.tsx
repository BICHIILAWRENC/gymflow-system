import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

export default function TrainerDashboard() {
  const { trainerId } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const now = new Date();
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });

  useEffect(() => {
    if (trainerId) fetchSessions();
  }, [trainerId, weekOffset]);

  const fetchSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('trainer_id', trainerId!)
      .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('session_date', format(weekEnd, 'yyyy-MM-dd'))
      .order('session_date')
      .order('start_time');

    setSessions(data || []);
    setLoading(false);
  };

  const updateSession = async (sessionId: string) => {
    const start = new Date(`2000-01-01T${editStart}`);
    const end = new Date(`2000-01-01T${editEnd}`);
    const diffMin = (end.getTime() - start.getTime()) / 60000;

    if (diffMin < 45 || diffMin > 120) {
      toast.error('Session must be between 45 minutes and 2 hours');
      return;
    }

    const { error } = await supabase
      .from('sessions')
      .update({ start_time: editStart, end_time: editEnd })
      .eq('id', sessionId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Session updated');
      setEditingSession(null);
      fetchSessions();
    }
  };

  return (
    <DashboardLayout title="Trainer Dashboard" subtitle="Your weekly schedule">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>← Prev</Button>
          <span className="text-sm font-medium text-foreground">
            {format(weekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>Next →</Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>This Week</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-green-light flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Sessions This Week</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">{sessions.length}</p>
        </div>
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-orange-light flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {sessions.reduce((acc, s) => {
              const start = new Date(`2000-01-01T${s.start_time}`);
              const end = new Date(`2000-01-01T${s.end_time}`);
              return acc + (end.getTime() - start.getTime()) / 3600000;
            }, 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Sessions list */}
      <div className="gym-card">
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No sessions scheduled for this week</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map(s => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(s.session_date), 'EEEE, dd MMM')}
                  </p>
                  {editingSession === s.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="time"
                        value={editStart}
                        onChange={e => setEditStart(e.target.value)}
                        className="w-28 h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={editEnd}
                        onChange={e => setEditEnd(e.target.value)}
                        className="w-28 h-8 text-xs"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                      {s.sauna && ` · 🔥 Sauna`}
                    </p>
                  )}
                </div>
                <div>
                  {editingSession === s.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateSession(s.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSession(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSession(s.id);
                        setEditStart(s.start_time.slice(0, 5));
                        setEditEnd(s.end_time.slice(0, 5));
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
