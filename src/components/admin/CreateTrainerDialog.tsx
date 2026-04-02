import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTrainerDialog({ open, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!email || !password || !fullName) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    if (data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'trainer' as any });
      await supabase.from('trainers').insert({ user_id: data.user.id, specialization });
    }

    toast.success('Trainer created successfully');
    setSaving(false);
    setEmail('');
    setPassword('');
    setFullName('');
    setSpecialization('');
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Trainer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-2">
            <Label>Specialization (optional)</Label>
            <Input value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="e.g. Weight Training, Yoga" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Trainer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
