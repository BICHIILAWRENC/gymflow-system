import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileTab() {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load phone on first render
  if (!loaded && user) {
    supabase
      .from('profiles')
      .select('phone')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setPhone(data?.phone || '');
        setLoaded(true);
      });
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile updated successfully');
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          Email
        </Label>
        <Input value={profile?.email || user?.email || ''} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          Full Name
        </Label>
        <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          Phone Number
        </Label>
        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 700 000 000" />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
