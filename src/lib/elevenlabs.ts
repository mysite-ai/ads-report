const API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = 'https://api.elevenlabs.io/v1';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  error?: string;
}

export async function transcribeFromUrl(videoUrl: string): Promise<TranscriptionResult> {
  if (!API_KEY) {
    return { text: '', error: 'Brak klucza API ElevenLabs' };
  }

  try {
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return { text: '', error: `Nie udało się pobrać video: ${videoResponse.status}` };
    }

    const videoBlob = await videoResponse.blob();
    const formData = new FormData();
    formData.append('file', videoBlob, 'video.mp4');
    formData.append('model_id', 'scribe_v1');

    const response = await fetch(`${BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        text: '', 
        error: `ElevenLabs API error: ${response.status} - ${errorData.detail || response.statusText}` 
      };
    }

    const data = await response.json();

    return {
      text: data.text || '',
      language: data.language_code || data.detected_language,
      duration: data.audio_duration
    };
  } catch (error) {
    return {
      text: '',
      error: `Transcription error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function transcribeFromBuffer(buffer: Buffer, filename: string = 'audio.mp4'): Promise<TranscriptionResult> {
  if (!API_KEY) {
    return { text: '', error: 'Brak klucza API ElevenLabs' };
  }

  try {
    const uint8Array = new Uint8Array(buffer);
    const blob = new Blob([uint8Array], { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model_id', 'scribe_v1');

    const response = await fetch(`${BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        text: '', 
        error: `ElevenLabs API error: ${response.status} - ${errorData.detail || response.statusText}` 
      };
    }

    const data = await response.json();

    return {
      text: data.text || '',
      language: data.language_code || data.detected_language,
      duration: data.audio_duration
    };
  } catch (error) {
    return {
      text: '',
      error: `Transcription error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
