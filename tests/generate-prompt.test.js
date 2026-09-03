import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLovableBuildUrl,
  generatePrompt,
  generateQaPrompt,
} from '../lib/generate-prompt.js';
import {
  channelOptions,
  guidedOptions,
  templates,
  toneOptions,
} from '../lib/builder-config.js';
import { validateSubmission } from '../lib/submission-validation.js';

test('genera un prompt inmobiliario con los datos del formulario', () => {
  const prompt = generatePrompt({
    websiteType: 'development-presale',
    company: 'Costa Norte',
    location: 'Tijuana',
    specialty: 'Preventa',
    audience: 'Familias jóvenes',
    offerDetails: '24 departamentos de dos recámaras con entrega estimada en 2027',
    difference: 'Acompañamiento legal',
    tone: 'Premium y sobrio',
    contactChannel: 'WhatsApp',
    visualStyle: 'editorial-luxury',
  });
  assert.match(prompt, /Marca: Costa Norte/);
  assert.match(prompt, /Tipo de página: Desarrollo \/ Preventa/);
  assert.match(prompt, /familias jóvenes/i);
  assert.match(prompt, /premium y sobrio/i);
  assert.match(prompt, /DIRECCIÓN DE ARTE — EDITORIAL DE LUJO/);
  assert.match(prompt, /serif editorial de alto contraste/i);
});

test('valida consentimiento cuando se captura WhatsApp', () => {
  const result = validateSubmission({
    participantId: '5f5b95d6-5b3f-4d4b-9b7c-383cc2d2cc74',
    sessionSlug: 'expo-2026',
    websiteType: 'agency-advisor',
    whatsapp: '526641234567',
    whatsappConsent: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /autorización/i);
});

test('normaliza una entrega válida para Supabase', () => {
  const result = validateSubmission({
    participantId: '5f5b95d6-5b3f-4d4b-9b7c-383cc2d2cc74',
    submissionId: 'b33f16bd-0f09-44d7-b0b7-4b410516319e',
    sessionSlug: 'expo-2026',
    progressStep: 5,
    websiteType: 'featured-property',
    company: '  Horizonte  ',
    tone: 'Cálido y cercano',
    contactChannel: 'Agenda de citas',
    visualStyle: 'warm-organic',
    styleIntensity: 'Expresiva',
    brandColor: 'Azul petróleo, crema cálido y acentos dorados discretos',
    audienceSelections: ['first-home', 'growing-family'],
    offerPreset: 'family-home',
    specialtyPreset: 'residential-sales',
    differencePreset: 'local-knowledge',
    trustSelections: ['verified-reviews'],
    whatsapp: '+52 664 123 4567',
    contactConsent: true,
    starterPackRequested: true,
  });
  assert.equal(result.ok, true);
  assert.equal(result.submission.submission_id, 'b33f16bd-0f09-44d7-b0b7-4b410516319e');
  assert.equal(result.submission.company_name, 'Horizonte');
  assert.equal(result.submission.progress_step, 5);
  assert.equal(result.submission.email, null);
  assert.equal(result.submission.whatsapp, '526641234567');
  assert.equal(result.submission.visual_style, 'warm-organic');
  assert.equal(result.submission.brand_color, 'Azul petróleo, crema cálido y acentos dorados discretos');
  assert.deepEqual(result.submission.builder_data.audience_selections, ['first-home', 'growing-family']);
  assert.equal(result.submission.builder_data.offer_preset, 'family-home');
  assert.deepEqual(result.submission.builder_data.trust_selections, ['verified-reviews']);
  assert.ok(result.submission.completed_at);
  assert.ok(result.submission.generated_prompt.includes('Horizonte'));
  assert.match(result.submission.generated_prompt, /Azul petróleo, crema cálido y acentos dorados discretos/);
});

test('requiere WhatsApp cuando se solicita el Starter Pack', () => {
  const result = validateSubmission({
    participantId: '5f5b95d6-5b3f-4d4b-9b7c-383cc2d2cc74',
    sessionSlug: 'expo-2026',
    websiteType: 'featured-property',
    email: 'andrea@example.com',
    contactConsent: true,
    starterPackRequested: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /WhatsApp/i);
});

test('cambia la arquitectura del prompt según el embudo elegido', () => {
  const base = {
    company: 'Horizonte',
    location: 'Tijuana',
    audience: 'Propietarios locales',
    offerDetails: 'Servicio de valoración y venta residencial',
    visualStyle: 'trusted-professional',
  };
  const propertyPrompt = generatePrompt({ ...base, websiteType: 'featured-property' });
  const sellerPrompt = generatePrompt({ ...base, websiteType: 'sell-property' });

  assert.match(propertyPrompt, /Galería editorial/);
  assert.doesNotMatch(propertyPrompt, /Formulario breve de propiedad/);
  assert.match(sellerPrompt, /Formulario breve de propiedad/);
  assert.match(sellerPrompt, /Metodología de precio/);
});

test('genera un enlace de Lovable que conserva el prompt completo', () => {
  const prompt = 'Construye una página para Casa Ñandú\nCon CTA de visita.';
  const url = createLovableBuildUrl(prompt);
  const prefix = 'https://lovable.dev/#prompt=';

  assert.ok(url.startsWith(prefix));
  assert.equal(decodeURIComponent(url.slice(prefix.length)), prompt);
});

test('incluye un prompt separado para revisar la construcción', () => {
  const prompt = generateQaPrompt({
    websiteType: 'open-house',
    visualStyle: 'urban-bold',
  });

  assert.match(prompt, /browser testing/i);
  assert.match(prompt, /Urbano audaz/);
  assert.match(prompt, /Reservar asistencia/);
});

test('cada embudo ofrece suficientes atajos editables y las opciones visuales tienen contexto', () => {
  for (const template of templates) {
    const options = guidedOptions[template.id];
    assert.ok(options, `Faltan opciones para ${template.id}`);
    assert.ok(options.audience.length >= 6);
    assert.ok(options.offer.length >= 4);
    assert.ok(options.specialty.length >= 4);
    assert.ok(options.audience.every((option) => option.text.length > 55));
    assert.ok(options.offer.every((option) => option.text.length > 90));
  }

  assert.equal(toneOptions.length, 5);
  assert.ok(toneOptions.every((option) => option.sample && option.accent && option.soft));
  assert.equal(channelOptions.length, 4);
  assert.ok(channelOptions.every((option) => option.description && option.accent && option.soft));
});
