import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, Calendar, TrendingUp, Plus, Pencil, Trash2, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import CreateMemberDialog from '@/components/admin/CreateMemberDialog';
import CreateTrainerDialog from '@/components/admin/CreateTrainerDialog';
import EditMemberDialog from '@/components/admin/EditMemberDialog';
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog';

export default function AdminDashboard() {
  const [members, setMembers] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [showCreateTrainer, setShowCreateTrainer] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'member' | 'trainer'; item: any } | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);

    const [membersRes, trainersRes, paymentsRes, sessionsRes] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('trainers').select('*'),
      supabase.from('payments').select('*').order('payment_date', { ascending: false }),
      supabase.from('sessions').select('*').order('session_date', { ascending: false }).limit(50),
    ]);

    const memberData = membersRes.data || [];
    const trainerData = trainersRes.data || [];

    // Fetch profiles for all users
    const allUserIds = [
      ...memberData.map(m => m.user_id),
      ...trainerData.map(t => t.user_id),
    ];
    let profilesMap: Record<string, { full_name: string; email: string }> = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', allUserIds);
      profiles?.forEach(p => { profilesMap[p.user_id] = p; });
    }

    const enrichedMembers = memberData.map(m => ({
      ...m,
      profile: profilesMap[m.user_id] || { full_name: 'Unknown', email: '' },
    }));

    const enrichedTrainers = trainerData.map(t => ({
      ...t,
      profile: profilesMap[t.user_id] || { full_name: 'Unknown', email: '' },
    }));

    const memberIdToProfile: Record<string, { full_name: string }> = {};
    memberData.forEach(m => {
      memberIdToProfile[m.id] = profilesMap[m.user_id] || { full_name: 'Unknown' };
    });

    const enrichedPayments = (paymentsRes.data || []).map(p => ({
      ...p,
      memberName: memberIdToProfile[p.member_id]?.full_name || 'Unknown',
    }));

    setMembers(enrichedMembers);
    setTrainers(enrichedTrainers);
    setPayments(enrichedPayments);
    setSessions(sessionsRes.data || []);
    setLoading(false);
  };

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.total_amount), 0);

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="System overview and management">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-green-light flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Members</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{members.length}</p>
        </div>
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-orange-light flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-accent" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Trainers</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{trainers.length}</p>
        </div>
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-green-light flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Sessions</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">{sessions.length}</p>
        </div>
        <div className="gym-stat">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gym-green-light flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Revenue</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-foreground">Ksh {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="gym-card">
        <TabsList className="w-full border-b border-border rounded-none bg-transparent px-2 pt-2 flex-wrap">
          <TabsTrigger value="members" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Members</TabsTrigger>
          <TabsTrigger value="trainers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Trainers</TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Payments</TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sessions</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground">{members.length} members</h3>
            <Button size="sm" onClick={() => setShowCreateMember(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Member
            </Button>
          </div>
          {loading ? (
            <div className="p-6 animate-pulse space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Expiry</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map(m => {
                    const expired = !m.membership_expiry || new Date(m.membership_expiry) < new Date();
                    return (
                      <tr key={m.id}>
                        <td className="p-4 font-medium text-foreground">{m.profile?.full_name}</td>
                        <td className="p-4 text-muted-foreground">{m.profile?.email}</td>
                        <td className="p-4 tabular-nums text-foreground">
                          {m.membership_expiry ? format(new Date(m.membership_expiry), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            expired ? 'bg-destructive/10 text-destructive' : 'bg-gym-green-light text-primary'
                          }`}>
                            {expired ? 'Expired' : 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingMember(m)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ type: 'member', item: { id: m.id, user_id: m.user_id, name: m.profile?.full_name } })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {members.length === 0 && <p className="p-8 text-center text-muted-foreground">No members yet</p>}
            </div>
          )}
        </TabsContent>

        {/* Trainers Tab */}
        <TabsContent value="trainers" className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground">{trainers.length} trainers</h3>
            <Button size="sm" onClick={() => setShowCreateTrainer(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Trainer
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Specialization</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trainers.map(t => (
                  <tr key={t.id}>
                    <td className="p-4 font-medium text-foreground">{t.profile?.full_name}</td>
                    <td className="p-4 text-muted-foreground">{t.profile?.email}</td>
                    <td className="p-4 text-foreground">{t.specialization || '—'}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ type: 'trainer', item: { id: t.id, user_id: t.user_id, name: t.profile?.full_name } })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trainers.length === 0 && <p className="p-8 text-center text-muted-foreground">No trainers yet</p>}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Member</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Months</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Method</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="p-4 font-medium text-foreground">{p.memberName}</td>
                    <td className="p-4 tabular-nums text-foreground">Ksh {Number(p.total_amount).toLocaleString()}</td>
                    <td className="p-4 tabular-nums text-foreground">{p.months}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground uppercase">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="p-4 tabular-nums text-muted-foreground">
                      {format(new Date(p.payment_date), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && <p className="p-8 text-center text-muted-foreground">No payments recorded</p>}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Time</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Sauna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td className="p-4 text-foreground">{format(new Date(s.session_date), 'dd MMM yyyy')}</td>
                    <td className="p-4 tabular-nums text-foreground">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</td>
                    <td className="p-4">{s.sauna ? `🔥 ${s.sauna_duration}min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length === 0 && <p className="p-8 text-center text-muted-foreground">No sessions recorded</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateMemberDialog open={showCreateMember} onClose={() => setShowCreateMember(false)} onSuccess={fetchAll} />
      <CreateTrainerDialog open={showCreateTrainer} onClose={() => setShowCreateTrainer(false)} onSuccess={fetchAll} />
      {editingMember && (
        <EditMemberDialog open={!!editingMember} member={editingMember} onClose={() => setEditingMember(null)} onSuccess={fetchAll} />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          open={!!deleteTarget}
          type={deleteTarget.type}
          item={deleteTarget.item}
          onClose={() => setDeleteTarget(null)}
          onSuccess={fetchAll}
        />
      )}
    </DashboardLayout>
  );
}
