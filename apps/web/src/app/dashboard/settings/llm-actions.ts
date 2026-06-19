'use server';

import { revalidatePath } from 'next/cache';
import { saveTenantLlmConfig, type LlmConfig } from '@eventflow/db';
import { getCurrentUser } from '@/lib/auth';

export interface LlmState {
  ok: boolean;
  error: string | null;
  tested?: boolean;
}

/**
 * Guarda la configuración del LLM OpenAI-compatible para el tenant.
 * Permite cualquier proveedor (OpenRouter, OpenAI, Groq, Ollama, etc.) con API compatible.
 */
export async function saveLlmConfigAction(
  _prev: LlmState,
  formData: FormData,
): Promise<LlmState> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { ok: false, error: 'No autorizado.' };
  if (!user.isSuperAdmin && !user.permissions.includes('ai:configure')) {
    return { ok: false, error: 'No tienes permiso para configurar la IA.' };
  }

  const baseUrl = String(formData.get('baseUrl') ?? '').trim();
  const apiKey = String(formData.get('apiKey') ?? '').trim();
  const model = String(formData.get('model') ?? '').trim();
  const embeddingModel = String(formData.get('embeddingModel') ?? '').trim();
  const temperature = parseFloat(String(formData.get('temperature') ?? '0.3'));
  const maxTokens = parseInt(String(formData.get('maxTokens') ?? '400'), 10);
  const disable = formData.get('disable') === 'true';

  if (disable) {
    await saveTenantLlmConfig(user.tenantId, null);
    revalidatePath('/dashboard/settings');
    return { ok: true, error: null };
  }

  if (!baseUrl || !apiKey || !model) {
    return { ok: false, error: 'URL del proveedor, clave de API y modelo son obligatorios.' };
  }

  try { new URL(baseUrl); } catch {
    return { ok: false, error: 'La URL del proveedor no es válida.' };
  }

  const config: LlmConfig = {
    baseUrl,
    apiKey,
    model,
    embeddingModel: embeddingModel || undefined,
    temperature: isNaN(temperature) ? 0.3 : Math.min(2, Math.max(0, temperature)),
    maxTokens: isNaN(maxTokens) ? 400 : Math.min(4000, Math.max(100, maxTokens)),
  };

  await saveTenantLlmConfig(user.tenantId, config);
  revalidatePath('/dashboard/settings');
  return { ok: true, error: null };
}
