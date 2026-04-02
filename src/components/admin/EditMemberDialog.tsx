import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  member: { id: string; user_id: string; membership_expiry: string | null; profile: { full_name: string; email: string } } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMemberDialog({ open, member, onClose, onSuccess }: Props) {
  const [fullName, setFullName] = useState(member?.profile?.full_name || '');
  const [membershipExpiry, setMembershipExpiry] = useState(member?.membership_expiry || '');

  const handleSave = async () => {
    if (!member) return;

    const [profileRes, memberRes] = await Promise.all([
      supabase.from('profiles').update({ full_name: fullName }).eq('user_id', member.user_id),
      supabase.from('members').update({ membership_expiry: membershipExpiry || null }).eq('id', member.id),
    ]);

    if (profileRes.error || memberRes.error) {
      toast.error('Failed to update member');
    } else {
      toast.success('Member updated');
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={member?.profile?.email || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Membership Expiry</Label>
            <Input type="date" value={membershipExpiry} onChange={e => setMembershipExpiry(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
