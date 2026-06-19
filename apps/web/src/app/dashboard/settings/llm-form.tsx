'use client';

import { useActionState, useState } from 'react';
import { saveLlmConfigAction, type LlmState } from './llm-actions';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@eventflow/ui';

const PRESETS = [
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', placeholder: 'openai/gpt-4o-mini' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', placeholder: 'gpt-4o-mini' },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', placeholder: 'llama-3.3-70b-versatile' },
  { name: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', placeholder: 'llama3.2' },
  { name: 'Azure OpenAI', baseUrl: 'https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT', placeholder: 'gpt-4o' },
];

const initial: LlmState = { ok: false, error: null };

export function LlmForm({
  current,
}: {
  current: { baseUrl?: string; model?: string; active: boolean };
}) {
  const [state, formAction, pending] = useActionState(saveLlmConfigAction, initial);
  const [baseUrl, setBaseUrl] = useState(current.baseUrl ?? '');
  const [model, setModel] = useState(current.model ?? '');

  const selectedPreset = PRESETS.find((p) => p.baseUrl === baseUrl);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Proveedor LLM</p>
          <p className="text-sm text-white/50">
            {current.active
              ? `Activo: ${current.model} (${current.baseUrl?.replace(/https?:\/\//, '').split('/')[0]})`
              : 'No configurado — el asistente usa modo extractivo.'}
          </p>
        </div>
        {current.active && (
          <form action={formAction}>
            <input type="hidden" name="disable" value="true" />
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              Desactivar LLM
            </Button>
          </form>
        )}
      </div>

      {/* Presets */}
      <div>
        <p className="mb-2 text-sm text-white/60">Elige un proveedor o personaliza:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setBaseUrl(p.baseUrl)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                baseUrl === p.baseUrl
                  ? 'bg-brand-500 text-white'
                  : 'border border-white/15 text-white/60 hover:bg-white/10',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="baseUrl">URL del proveedor</Label>
          <Input
            id="baseUrl"
            name="baseUrl"
            required
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
          <p className="mt-1 text-xs text-white/35">
            Cualquier endpoint compatible con la API de OpenAI (chat completions).
          </p>
        </div>

        <div>
          <Label htmlFor="apiKey">Clave de API (API Key)</Label>
          <Input
            id="apiKey"
            name="apiKey"
            type="password"
            required
            placeholder="sk-..."
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-white/35">Se guarda cifrada. No se muestra una vez guardada.</p>
        </div>

        <div>
          <Label htmlFor="model">Modelo</Label>
          <Input
            id="model"
            name="model"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={selectedPreset?.placeholder ?? 'gpt-4o-mini'}
          />
          <p className="mt-1 text-xs text-white/35">
            {selectedPreset?.name === 'OpenRouter'
              ? 'En OpenRouter usa formato: proveedor/modelo (ej. openai/gpt-4o-mini, anthropic/claude-3.5-haiku)'
              : 'Nombre exacto del modelo del proveedor.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="temperature">Temperatura (0–1)</Label>
            <Input id="temperature" name="temperature" type="number" min="0" max="1" step="0.1" defaultValue="0.3" />
          </div>
          <div>
            <Label htmlFor="maxTokens">Máx. tokens respuesta</Label>
            <Input id="maxTokens" name="maxTokens" type="number" min="100" max="4000" defaultValue="400" />
          </div>
        </div>

        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-300">✓ Configuración de LLM guardada.</p>}

        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar configuración de LLM'}
        </Button>
      </form>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
        <p className="font-medium text-white/60">¿Qué hace esto?</p>
        <p className="mt-1">
          Con un LLM configurado, el asistente generará respuestas conversacionales y naturales.
          Sin LLM, usa modo extractivo (responde con texto del conocimiento indexado).
          En ambos casos, <strong className="text-white/70">solo responde con información verificada</strong> del
          evento — jamás inventa datos.
        </p>
      </div>
    </div>
  );
}
