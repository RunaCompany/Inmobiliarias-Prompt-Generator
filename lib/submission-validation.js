import {
  channels,
  styleIntensities,
  templates,
  tones,
  visualStyles,
} from './builder-config.js';
import { generatePrompt } from './generate-prompt.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function textList(value, maximumItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => text(item, 48))
    .filter(Boolean)
    .slice(0, maximumItems);
}

function publicUrl(value) {
  const candidate = text(value, 500);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function validateSubmission(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'El contenido enviado no es válido.' };
  }

  const participantId = text(value.participantId, 36);
  const submissionId = text(value.submissionId || value.participantId, 36);
  const sessionSlug = text(value.sessionSlug || 'general', 48).toLowerCase();
  const websiteType = text(value.websiteType, 40);
  const tone = text(value.tone, 40);
  const contactChannel = text(value.contactChannel, 40);
  const visualStyle = text(value.visualStyle, 40);
  const styleIntensity = text(value.styleIntensity, 20);
  const email = text(value.email, 254).toLowerCase();
  const whatsapp = String(value.whatsapp || '').replace(/\D/g, '').slice(0, 15);
  const businessWhatsapp = String(value.businessWhatsapp || '').replace(/\D/g, '').slice(0, 15);
  const businessPhone = String(value.businessPhone || '').replace(/\D/g, '').slice(0, 15);
  const contactConsent = value.contactConsent === true || value.whatsappConsent === true;
  const starterPackRequested = value.starterPackRequested === true;
  const progressStep = Math.max(1, Math.min(5, Number(value.progressStep) || 1));

  if (!UUID_PATTERN.test(participantId)) return { ok: false, error: 'La sesión del participante no es válida.' };
  if (!UUID_PATTERN.test(submissionId)) return { ok: false, error: 'El identificador del prompt no es válido.' };
  if (!SLUG_PATTERN.test(sessionSlug)) return { ok: false, error: 'La sesión del evento no es válida.' };
  if (websiteType && !templates.some((item) => item.id === websiteType)) return { ok: false, error: 'El tipo de página no es válido.' };
  if (tone && !tones.includes(tone)) return { ok: false, error: 'El tono seleccionado no es válido.' };
  if (contactChannel && !channels.includes(contactChannel)) return { ok: false, error: 'El canal seleccionado no es válido.' };
  if (visualStyle && !visualStyles.some((item) => item.id === visualStyle)) return { ok: false, error: 'El estilo visual no es válido.' };
  if (styleIntensity && !styleIntensities.includes(styleIntensity)) return { ok: false, error: 'La intensidad visual no es válida.' };
  if (email && !EMAIL_PATTERN.test(email)) return { ok: false, error: 'El correo electrónico no es válido.' };
  if (whatsapp && (whatsapp.length < 10 || whatsapp.length > 15)) return { ok: false, error: 'El número de WhatsApp no es válido.' };
  if (contactChannel === 'WhatsApp' && businessWhatsapp && (businessWhatsapp.length < 10 || businessWhatsapp.length > 15)) return { ok: false, error: 'El WhatsApp comercial no es válido.' };
  if (contactChannel === 'Llamada telefónica' && businessPhone && (businessPhone.length < 10 || businessPhone.length > 15)) return { ok: false, error: 'El teléfono comercial no es válido.' };
  if ((email || whatsapp) && !contactConsent) return { ok: false, error: 'Necesitamos tu autorización para guardar los datos de contacto.' };
  if (starterPackRequested && !whatsapp) return { ok: false, error: 'Necesitamos un WhatsApp para enviar el Starter Pack.' };

  const brandColor = text(value.brandColor, 160);

  const bookingUrlValue = text(value.bookingUrl, 500);
  const bookingUrl = publicUrl(bookingUrlValue);
  if (contactChannel === 'Agenda de citas' && bookingUrlValue && !bookingUrl) return { ok: false, error: 'El enlace de agenda no es válido.' };

  const businessEmail = text(value.businessEmail, 254).toLowerCase();
  if (contactChannel === 'Formulario de contacto' && businessEmail && !EMAIL_PATTERN.test(businessEmail)) return { ok: false, error: 'El correo comercial no es válido.' };

  const submission = {
    participant_id: participantId,
    submission_id: submissionId,
    session_slug: sessionSlug,
    progress_step: progressStep,
    website_type: websiteType || null,
    company_name: text(value.company, 120) || null,
    location: text(value.location, 120) || null,
    specialty: text(value.specialty, 160) || null,
    target_audience: text(value.audience, 600) || null,
    differentiator: text(value.difference, 600) || null,
    brand_tone: tone || tones[0],
    visual_style: visualStyle || visualStyles[1].id,
    style_intensity: styleIntensity || styleIntensities[1],
    brand_color: brandColor || null,
    contact_channel: contactChannel || channels[0],
    contact_name: text(value.contactName, 120) || null,
    email: email || null,
    whatsapp: whatsapp || null,
    whatsapp_consent: Boolean(contactConsent && whatsapp),
    contact_consent: Boolean(contactConsent && (email || whatsapp)),
    starter_pack_requested: starterPackRequested,
    prompt_version: 2,
    builder_data: {
      offer_details: text(value.offerDetails, 1200) || null,
      offer_preset: text(value.offerPreset, 48) || null,
      audience_selections: textList(value.audienceSelections),
      specialty_preset: text(value.specialtyPreset, 48) || null,
      difference_preset: text(value.differencePreset, 48) || null,
      trust_proof: text(value.trustProof, 1000) || null,
      trust_selections: textList(value.trustSelections),
      business_whatsapp: contactChannel === 'WhatsApp' ? businessWhatsapp || null : null,
      business_phone: contactChannel === 'Llamada telefónica' ? businessPhone || null : null,
      business_email: contactChannel === 'Formulario de contacto' ? businessEmail || null : null,
      booking_url: contactChannel === 'Agenda de citas' ? bookingUrl || null : null,
    },
    generated_prompt: websiteType ? generatePrompt(value) : null,
    completed_at: progressStep === 5 ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  return { ok: true, submission };
}
