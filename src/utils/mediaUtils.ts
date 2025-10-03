import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export const capturePhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Error capturing photo:', error);
    return null;
  }
};

export const pickImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

export const getCurrentLocation = async () => {
  try {
    const position = await Geolocation.getCurrentPosition();
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

export const startVoiceRecording = () => {
  return new Promise<Blob>((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.addEventListener('dataavailable', event => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        });

        mediaRecorder.start();

        // Auto-stop after 5 minutes
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 300000);

        // Return recorder control
        (window as any).currentRecorder = mediaRecorder;
      })
      .catch(reject);
  });
};

export const stopVoiceRecording = () => {
  const recorder = (window as any).currentRecorder;
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
  }
};
