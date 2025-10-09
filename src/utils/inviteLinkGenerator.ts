import { supabase } from "@/integrations/supabase/client";

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createInviteLink = async (userId: string): Promise<string> => {
  // Check if user already has an invite link
  const { data: existing } = await supabase
    .from('invite_links')
    .select('invite_code')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return `${window.location.origin}/invite/${existing.invite_code}`;
  }

  // Generate unique code
  let inviteCode = generateInviteCode();
  let isUnique = false;

  while (!isUnique) {
    const { data } = await supabase
      .from('invite_links')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!data) {
      isUnique = true;
    } else {
      inviteCode = generateInviteCode();
    }
  }

  // Create invite link
  await supabase
    .from('invite_links')
    .insert({ user_id: userId, invite_code: inviteCode });

  return `${window.location.origin}/invite/${inviteCode}`;
};

export const getInviteMessage = (inviteLink: string, userName?: string): string => {
  const message = userName 
    ? `Hey! ${userName} invited you to join Chatr - a modern messaging app. Join now: ${inviteLink}`
    : `Join me on Chatr - a modern messaging app! ${inviteLink}`;
  
  return message;
};

export const shareViaWhatsApp = (inviteLink: string, userName?: string) => {
  const message = encodeURIComponent(getInviteMessage(inviteLink, userName));
  window.open(`https://wa.me/?text=${message}`, '_blank');
};

export const shareViaSMS = (phone: string, inviteLink: string, userName?: string) => {
  const message = encodeURIComponent(getInviteMessage(inviteLink, userName));
  window.open(`sms:${phone}?body=${message}`, '_blank');
};

export const shareViaEmail = (email: string, inviteLink: string, userName?: string) => {
  const subject = encodeURIComponent('Join me on Chatr!');
  const body = encodeURIComponent(getInviteMessage(inviteLink, userName));
  window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
};

export const copyInviteLink = async (inviteLink: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(inviteLink);
    return true;
  } catch (error) {
    console.error('Failed to copy invite link:', error);
    return false;
  }
};
