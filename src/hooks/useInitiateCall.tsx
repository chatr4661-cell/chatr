import { useCall } from '@/contexts/CallContext';
import { useNavigate } from 'react-router-dom';


/**
 * useInitiateCall - Hook to start calls from ANY screen
 * 
 * Usage:
 *   const { call, callVoice, callVideo } = useInitiateCall();
 *   
 *   // From chat screen
 *   <Button onClick={() => callVoice(contactId, contactName)}>📞</Button>
 *   
 *   // From contacts
 *   <Button onClick={() => callVideo(contact.id, contact.name, contact.avatar)}>📹</Button>
 */
export function useInitiateCall() {
  const { initiateCall, isInCall, hasIncomingCall } = useCall();
  const navigate = useNavigate();

  const call = async (
    partnerId: string,
    partnerName: string,
    callType: 'voice' | 'video',
    partnerAvatar?: string,
    partnerPhone?: string,
    conversationId?: string
  ) => {
    if (isInCall) {
      console.log('📞 [Call] Already in a call');
      return null;
    }
    
    if (hasIncomingCall) {
      console.log('📞 [Call] Has incoming call');
      return null;
    }

    const callId = await initiateCall({
      partnerId,
      partnerName,
      partnerAvatar,
      partnerPhone,
      callType,
      conversationId,
    });

    return callId;
  };

  const callVoice = (
    partnerId: string, 
    partnerName: string, 
    partnerAvatar?: string,
    partnerPhone?: string,
    conversationId?: string
  ) => call(partnerId, partnerName, 'voice', partnerAvatar, partnerPhone, conversationId);

  const callVideo = (
    partnerId: string, 
    partnerName: string, 
    partnerAvatar?: string,
    partnerPhone?: string,
    conversationId?: string
  ) => call(partnerId, partnerName, 'video', partnerAvatar, partnerPhone, conversationId);

  return {
    call,
    callVoice,
    callVideo,
    isInCall,
    hasIncomingCall,
  };
}
