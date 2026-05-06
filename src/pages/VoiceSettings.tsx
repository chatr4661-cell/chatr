import { useVoiceContext } from '@/voice/VoicePlayerContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSpeechInput } from '@/voice/useSpeechInput';
import { STT_LANGUAGES } from '@/voice/types';
import { ArrowLeft, Volume2, Mic, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VoiceSettings() {
  const navigate = useNavigate();
  const { prefs, voices, deviceSupported, updatePrefs, play, stop } = useVoiceContext();
  const { supported: sttSupported } = useSpeechInput();

  const sample = 'Hi, this is your Chatr voice assistant.';

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold">Voice Settings</h1>
      </header>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Master toggle */}
        <Section icon={<Volume2 className="w-4 h-4" />} title="Voice playback" desc="Read messages and content aloud using your device.">
          <Row label="Enable voice">
            <Switch checked={prefs.voice_enabled} onCheckedChange={(v) => updatePrefs({ voice_enabled: v })} />
          </Row>
          <Row label="Auto-read incoming messages" desc="When enabled, new messages are read aloud automatically.">
            <Switch
              checked={prefs.auto_read}
              disabled={!prefs.voice_enabled}
              onCheckedChange={(v) => updatePrefs({ auto_read: v })}
            />
          </Row>
        </Section>

        {/* Voice selection */}
        <Section title="Voice & speed">
          {!deviceSupported && (
            <p className="text-xs text-muted-foreground">Your browser does not support on-device voices.</p>
          )}
          {deviceSupported && (
            <>
              <Row label="Preferred voice">
                <Select
                  value={prefs.preferred_voice || 'auto'}
                  onValueChange={(v) => updatePrefs({ preferred_voice: v === 'auto' ? null : v })}
                >
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Auto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">System default</SelectItem>
                    {voices.map((v) => (
                      <SelectItem key={v.voiceURI} value={v.voiceURI}>
                        {v.name} {v.lang ? `(${v.lang})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label={`Speed: ${prefs.speech_rate.toFixed(2)}x`}>
                <Slider
                  className="w-40"
                  value={[prefs.speech_rate]}
                  min={0.75} max={2} step={0.05}
                  onValueChange={([v]) => updatePrefs({ speech_rate: v })}
                />
              </Row>
              <Row label={`Pitch: ${prefs.speech_pitch.toFixed(2)}`}>
                <Slider
                  className="w-40"
                  value={[prefs.speech_pitch]}
                  min={0} max={2} step={0.1}
                  onValueChange={([v]) => updatePrefs({ speech_pitch: v })}
                />
              </Row>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" onClick={() => play(sample)}>
                  <Play className="w-3 h-3 mr-1" /> Test voice
                </Button>
                <Button size="sm" variant="ghost" onClick={stop}>Stop</Button>
              </div>
            </>
          )}
        </Section>

        {/* Mode */}
        <Section title="Privacy mode" desc="Device mode keeps audio fully on your phone. Cloud uses premium voices.">
          <Row label="Voice mode">
            <Select value={prefs.mode} onValueChange={(v: any) => updatePrefs({ mode: v })}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="device">On-device (private)</SelectItem>
                <SelectItem value="cloud">Cloud premium</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </Section>

        {/* STT */}
        <Section icon={<Mic className="w-4 h-4" />} title="Voice input" desc="Hold the mic in chat to dictate. Audio is processed on-device.">
          <Row label="Enable voice input">
            <Switch
              checked={prefs.voice_input_enabled}
              disabled={!sttSupported}
              onCheckedChange={(v) => updatePrefs({ voice_input_enabled: v })}
            />
          </Row>
          {!sttSupported && (
            <p className="text-xs text-muted-foreground">Voice input is not supported on this browser.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon?: React.ReactNode; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {desc && <p className="text-xs text-muted-foreground -mt-1">{desc}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
