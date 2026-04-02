import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  type: 'member' | 'trainer';
  item: { id: string; user_id: string; name: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteConfirmDialog({ open, type, item, onClose, onSuccess }: Props) {
  const handleDelete = async () => {
    if (!item) return;

    if (type === 'member') {
      // Delete related sessions and payments first, then member record
      await supabase.from('sessions').delete().eq('member_id', item.id);
      await supabase.from('payments').delete().eq('member_id', item.id);
      await supabase.from('members').delete().eq('id', item.id);
    } else {
      // Delete related sessions, then trainer
      await supabase.from('sessions').delete().eq('trainer_id', item.id);
      await supabase.from('trainers').delete().eq('id', item.id);
    }

    // Clean up role and profile
    await supabase.from('user_roles').delete().eq('user_id', item.user_id);
    await supabase.from('profiles').delete().eq('user_id', item.user_id);

    toast.success(`${type === 'member' ? 'Member' : 'Trainer'} deleted`);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {type === 'member' ? 'Member' : 'Trainer'}</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{item?.name}</strong>? This will also remove all their related sessions{type === 'member' ? ' and payments' : ''}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
