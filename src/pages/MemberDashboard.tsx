import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar, CreditCard, Smartphone, Clock, Flame, DollarSign, User, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ProfileTab from '@/components/member/ProfileTab';
import PaymentHistoryTab from '@/components/member/PaymentHistoryTab';
import SessionHistoryTab from '@/components/member/SessionHistoryTab';

export default function MemberDashboard() {
  const { user, memberId } = useAuth();
  const [membershipExpiry, setMembershipExpiry] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Session form
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [useSauna, setUseSauna] = useState(false);
  const [saunaDuration, setSaunaDuration] = useState(10);

  // Payment form
  const [months, setMonths] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [showPayment, setShowPayment] = useState(false);

  const MONTHLY_COST = 5000;

  useEffect(() => {
    if (memberId) fetchData();
  }, [memberId]);

  const fetchData = async () => {
    setLoading(true);
    const [memberRes, sessionsRes, trainersRes] = await Promise.all([
      supabase.from('members').select('membership_expiry').eq('id', memberId!).single(),
      supabase.from('sessions').select('*').eq('member_id', memberId!).order('session_date', { ascending: false }),
      supabase.from('trainers').select('id, user_id, specialization').then(async (res) => {
        if (!res.data) return { data: [] };
        const trainerIds = res.data.map(t => t.user_id);
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', trainerIds);
        return { data: res.data.map(t => ({ ...t, name: profiles?.find(p => p.user_id === t.user_id)?.full_name || 'Unknown' })) };
      }),
    ]);

    setMembershipExpiry(memberRes.data?.membership_expiry || null);
    setSessions(sessionsRes.data || []);
    setTrainers(trainersRes.data || []);
    setLoading(false);
  };

  const bookSession = async () => {
    if (!sessionDate || !startTime || !endTime || !selectedTrainer) {
      toast.error('Please fill all session fields');
      return;
    }
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMin = (end.getTime() - start.getTime()) / 60000;
    if (diffMin < 45 || diffMin > 120) {
      toast.error('Session must be between 45 minutes and 2 hours');
      return;
    }
    const { error } = await supabase.from('sessions').insert({
      member_id: memberId!,
      trainer_id: selectedTrainer,
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      sauna: useSauna,
      sauna_duration: useSauna ? saunaDuration : 0,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Session booked!');
      setSessionDate('');
      setStartTime('');
      setEndTime('');
      setSelectedTrainer('');
      setUseSauna(false);
      fetchData();
    }
  };

  const makePayment = async () => {
    if (paymentMethod === 'mpesa') {
      toast.info('M-Pesa prompt sent to your phone. Please enter your PIN to confirm.');
      await new Promise(r => setTimeout(r, 2000));
    }
    const { error } = await supabase.from('payments').insert({
      member_id: memberId!,
      months,
      total_amount: months * MONTHLY_COST,
      payment_method: paymentMethod,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Payment of Ksh ${(months * MONTHLY_COST).toLocaleString()} successful!`);
      setShowPayment(false);
      fetchData();
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Member Dashboard">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  const isExpired = !membershipExpiry || new Date(membershipExpiry) < new Date();

  return (
    <DashboardLayout title="Member Dashboard" subtitle="Manage your gym membership">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-green-light flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Membership Expiry</span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
            {membershipExpiry ? format(new Date(membershipExpiry), 'dd MMM yyyy') : 'Not active'}
          </p>
          {isExpired && <span className="text-xs text-destructive">Expired — renew now</span>}
        </div>
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-orange-light flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Sessions</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">{sessions.length}</p>
        </div>
        <div className="gym-stat cursor-pointer" onClick={() => setShowPayment(true)}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-green-light flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Monthly Fee</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">Ksh 5,000</p>
          <span className="text-xs text-primary font-medium">Click to pay →</span>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="gym-card">
        <TabsList className="w-full border-b border-border rounded-none bg-transparent px-2 pt-2 flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="w-4 h-4 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="w-4 h-4 mr-1.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="w-4 h-4 mr-1.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4 mr-1.5" /> Sessions
          </TabsTrigger>
        </TabsList>

        {/* Overview: Book Session + Pay */}
        <TabsContent value="overview" className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Book Session */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Book a Session</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Trainer</Label>
                  <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                    <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                    <SelectContent>
                      {trainers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-accent" />
                    <Label>Use Sauna</Label>
                  </div>
                  <Switch checked={useSauna} onCheckedChange={setUseSauna} />
                </div>
                {useSauna && (
                  <div className="space-y-2">
                    <Label>Sauna Duration (10–15 min)</Label>
                    <Input type="number" min={10} max={15} value={saunaDuration} onChange={e => setSaunaDuration(Number(e.target.value))} />
                  </div>
                )}
                <Button onClick={bookSession} className="w-full">Book Session</Button>
              </div>
            </div>

            {/* Payment Panel */}
            {showPayment ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Make Payment</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of Months</Label>
                    <Select value={String(months)} onValueChange={v => setMonths(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 6, 12].map(m => (
                          <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="tabular-nums">Ksh 5,000/mo</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Months</span>
                      <span className="tabular-nums">{months}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">Ksh {(months * MONTHLY_COST).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('mpesa')}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                          paymentMethod === 'mpesa'
                            ? 'border-primary bg-gym-green-light text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" /> M-Pesa
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                          paymentMethod === 'card'
                            ? 'border-primary bg-gym-green-light text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" /> Card
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowPayment(false)}>Cancel</Button>
                    <Button className="flex-1" onClick={makePayment}>Pay Now</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
                {sessions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No sessions booked yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {sessions.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(s.session_date), 'dd MMM yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                            {s.sauna && ` · 🔥 Sauna ${s.sauna_duration}min`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="p-6">
          <ProfileTab />
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments" className="p-6">
          <PaymentHistoryTab />
        </TabsContent>

        {/* Session History Tab */}
        <TabsContent value="sessions" className="p-6">
          <SessionHistoryTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
