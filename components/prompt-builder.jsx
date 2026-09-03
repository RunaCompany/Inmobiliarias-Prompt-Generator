'use client';

import {
  AlignLeft01,
  ArrowLeft,
  ArrowRight,
  Building02,
  Building07,
  CalendarCheck02,
  Check,
  CheckCircle,
  Copy01,
  Diamond01,
  Edit05,
  FileCheck02,
  HomeLine,
  MessageChatCircle,
  MessageSmileSquare,
  LinkExternal01,
  Mail01,
  Palette,
  PhoneCall02,
  Plus,
  SearchLg,
  ShieldTick,
  Stars02,
  Users01,
  Zap,
} from '@untitledui/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button.jsx';
import { Checkbox } from './ui/checkbox.jsx';
import { Input, Select, Textarea } from './ui/input.jsx';
import {
  channelOptions,
  differentiatorOptions,
  emptyDraft,
  guidedOptions,
  styleIntensities,
  templates,
  toneOptions,
  trustOptions,
  visualStyles,
} from '../lib/builder-config.js';
import {
  createLovableBuildUrl,
  generatePrompt,
  generateQaPrompt,
} from '../lib/generate-prompt.js';

const CONTACT_PROFILE_KEY = 'runna-prompt-contact';
const DETAIL_STEP_COUNT = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const templateIcons = {
  'featured-property': HomeLine,
  'sell-property': Building07,
  'find-property': SearchLg,
  'open-house': CalendarCheck02,
  'development-presale': Building02,
  'agency-advisor': Users01,
};

const toneIcons = {
  warm: MessageSmileSquare,
  premium: Diamond01,
  modern: Zap,
  expert: ShieldTick,
  minimal: AlignLeft01,
};

const channelIcons = {
  whatsapp: MessageChatCircle,
  form: Mail01,
  calendar: CalendarCheck02,
  phone: PhoneCall02,
};

function cleanSessionSlug(value) {
  const slug = String(value || 'general')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return slug || 'general';
}

function createCompatibleUUID() {
  if (typeof window.crypto?.randomUUID === 'function') return window.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof window.crypto?.getRandomValues === 'function') {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

function readJson(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function createParticipantId(sessionSlug) {
  const key = `runna-prompt-participant:${sessionSlug}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = createCompatibleUUID();
  window.localStorage.setItem(key, id);
  return id;
}

function getActiveSubmissionId(sessionSlug) {
  const key = `runna-prompt-active:${sessionSlug}`;
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = createCompatibleUUID();
  window.localStorage.setItem(key, id);
  return id;
}

function contactFields(profile) {
  if (!profile?.contactConsent || !profile?.whatsapp) return {};
  return {
    contactName: profile.contactName || '',
    email: '',
    whatsapp: String(profile.whatsapp).replace(/\D/g, ''),
    contactConsent: true,
    whatsappConsent: true,
  };
}

function readContactProfile() {
  return readJson(CONTACT_PROFILE_KEY);
}

function saveContactProfile(draft) {
  const whatsapp = draft.whatsapp.replace(/\D/g, '');
  if (!draft.contactConsent || !whatsapp) return null;
  const profile = {
    contactName: draft.contactName.trim(),
    whatsapp,
    contactConsent: true,
  };
  window.localStorage.setItem(CONTACT_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

function draftKey(sessionSlug, submissionId) {
  return `runna-prompt-builder:${sessionSlug}:${submissionId}`;
}

function stepKey(sessionSlug, submissionId) {
  return `runna-prompt-step:${sessionSlug}:${submissionId}`;
}

function detailStepKey(sessionSlug, submissionId) {
  return `runna-prompt-detail-step:${sessionSlug}:${submissionId}`;
}

function readLocalDraft(sessionSlug, submissionId, profile) {
  const stored = readJson(draftKey(sessionSlug, submissionId));
  const legacy = readJson(`runna-prompt-builder:${sessionSlug}`);
  return { ...emptyDraft, ...(stored || legacy || {}), ...contactFields(profile), email: '' };
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}

function naturalList(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

function audienceText(options, selectedIds) {
  const selected = selectedIds
    .map((id) => options.find((option) => option.id === id)?.text)
    .filter(Boolean);
  return selected.length ? `Quiero atraer principalmente a ${naturalList(selected)}.` : '';
}

function trustText(selectedIds) {
  return selectedIds
    .map((id) => trustOptions.find((option) => option.id === id)?.text)
    .filter(Boolean)
    .join(' ');
}

function progressPercentage(step, detailStep) {
  if (step === 1) return 6;
  if (step === 2) return 10 + Math.round(((detailStep + 1) / DETAIL_STEP_COUNT) * 58);
  if (step === 3) return 78;
  if (step === 4) return 90;
  return 100;
}

function Progress({ step, detailStep }) {
  const percentage = progressPercentage(step, detailStep);
  return (
    <div
      className="journey-progress"
      role="progressbar"
      aria-label="Progreso del creador"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={percentage}
    >
      <i style={{ width: `${percentage}%` }} />
    </div>
  );
}

function ScreenHeading({ eyebrow, title, description }) {
  return (
    <header className="screen-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {description && <span>{description}</span>}
    </header>
  );
}

function QuestionHeading({ title, description }) {
  return (
    <header className="question-heading">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}

function PresetButton({ option, selected, onPress, multiple = false }) {
  return (
    <Button
      variant="secondary"
      className={`preset-button ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onPress={onPress}
    >
      <span className="preset-check" aria-hidden="true">{selected ? <Check /> : multiple ? '+' : ''}</span>
      <span>{option.label}</span>
    </Button>
  );
}

function WriteOwnButton({ selected, onPress }) {
  return (
    <Button
      variant="secondary"
      className={`preset-button write-own ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onPress={onPress}
    >
      <span className="preset-check"><Edit05 aria-hidden="true" /></span>
      <span>Escribir mi versión</span>
    </Button>
  );
}

function ToneButton({ option, selected, onPress }) {
  const Icon = toneIcons[option.id];
  return (
    <Button
      variant="secondary"
      className={`tone-button ${selected ? 'selected' : ''}`}
      style={{ '--option-accent': option.accent, '--option-soft': option.soft }}
      aria-pressed={selected}
      onPress={onPress}
    >
      <span className="option-icon"><Icon aria-hidden="true" /></span>
      <span className="option-copy">
        <strong>{option.label}</strong>
        <small>{option.description}</small>
        <em>“{option.sample}”</em>
      </span>
      <span className="option-selected" aria-hidden="true"><Check /></span>
    </Button>
  );
}

function ChannelButton({ option, selected, onPress }) {
  const Icon = channelIcons[option.id];
  return (
    <Button
      variant="secondary"
      className={`channel-button ${selected ? 'selected' : ''}`}
      style={{ '--option-accent': option.accent, '--option-soft': option.soft }}
      aria-pressed={selected}
      onPress={onPress}
    >
      <span className="option-icon"><Icon aria-hidden="true" /></span>
      <span className="option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
      <span className="option-selected" aria-hidden="true"><Check /></span>
    </Button>
  );
}

function QuestionFrame({ title, description, onSubmit, onBack, onSkip, nextLabel = 'Siguiente', children }) {
  return (
    <form
      className="detail-question"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <QuestionHeading title={title} description={description} />
      <div className="question-body">{children}</div>
      <div className="question-actions">
        <Button size="lg" className="full-button" type="submit">{nextLabel} <ArrowRight aria-hidden="true" /></Button>
        {onSkip && <Button variant="tertiary" className="full-button skip-question" type="button" onPress={onSkip}>Omitir por ahora</Button>}
        <Button variant="tertiary" className="back-button" type="button" onPress={onBack}><ArrowLeft aria-hidden="true" /> Regresar</Button>
      </div>
    </form>
  );
}

function StyleCard({ style, selected, onPress }) {
  return (
    <Button
      variant="secondary"
      className={`style-card ${selected ? 'selected' : ''}`}
      aria-label={`${style.title}. ${style.description}. Ideal para ${style.idealFor}.`}
      aria-pressed={selected}
      onPress={onPress}
    >
      <span className="style-preview" aria-hidden="true" style={{ '--swatch-one': style.swatches[0], '--swatch-two': style.swatches[1], '--swatch-three': style.swatches[2] }}>
        <i className="style-preview-title" />
        <i className="style-preview-copy" />
        <i className="style-preview-image" />
        <i className="style-preview-accent" />
      </span>
      <span className="style-card-copy">
        <span><strong>{style.title}</strong>{selected && <Check aria-hidden="true" />}</span>
        <small>{style.description}</small>
        <em>{style.idealFor}</em>
      </span>
    </Button>
  );
}

function SavedContact({ profile, onUse, onEdit, onSkip }) {
  return (
    <div className="saved-contact">
      <div className="saved-contact-heading">
        <span className="saved-contact-icon"><MessageChatCircle aria-hidden="true" /></span>
        <span>
          <strong>Ya guardamos tu WhatsApp</strong>
          <small>+{String(profile.whatsapp).replace(/\D/g, '')}</small>
        </span>
        <CheckCircle aria-hidden="true" />
      </div>
      <p>Podemos agregar este nuevo prompt a tu Starter Pack sin pedirte los datos otra vez.</p>
      <div className="saved-contact-actions">
        <Button size="lg" className="full-button" onPress={onUse}>Agregar a mi Starter Pack</Button>
        <Button variant="secondary" className="full-button" onPress={onEdit}>Cambiar datos</Button>
        <Button variant="tertiary" className="full-button" onPress={onSkip}>Continuar sin agregarlo</Button>
      </div>
    </div>
  );
}

export function PromptBuilder() {
  const [step, setStep] = useState(1);
  const [detailStep, setDetailStep] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [participantId, setParticipantId] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [sessionSlug, setSessionSlug] = useState('general');
  const [contactProfile, setContactProfile] = useState(null);
  const [editingContact, setEditingContact] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [selectedType, setSelectedType] = useState('');
  const hydrated = useRef(false);
  const saveQueue = useRef(Promise.resolve());

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === draft.websiteType) || templates[0],
    [draft.websiteType],
  );
  const activeGuidedOptions = guidedOptions[activeTemplate.id];
  const activeStyle = useMemo(
    () => visualStyles.find((item) => item.id === draft.visualStyle) || visualStyles[1],
    [draft.visualStyle],
  );
  const prompt = useMemo(() => generatePrompt(draft), [draft]);
  const qaPrompt = useMemo(() => generateQaPrompt(draft), [draft]);
  const lovableUrl = useMemo(() => createLovableBuildUrl(prompt), [prompt]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const activeSession = cleanSessionSlug(params.get('session'));
    const activeSubmission = getActiveSubmissionId(activeSession);
    const profile = readContactProfile();
    const initialDraft = readLocalDraft(activeSession, activeSubmission, profile);
    const storedStep = Number(
      window.localStorage.getItem(stepKey(activeSession, activeSubmission))
      || window.localStorage.getItem(`runna-prompt-step:${activeSession}`),
    );
    const storedDetailStep = Number(
      window.localStorage.getItem(detailStepKey(activeSession, activeSubmission)),
    );

    setSessionSlug(activeSession);
    setSubmissionId(activeSubmission);
    setParticipantId(createParticipantId(activeSession));
    setContactProfile(profile?.contactConsent && profile?.whatsapp ? profile : null);
    setDraft(initialDraft);
    if (storedStep >= 1 && storedStep <= 5) setStep(storedStep);
    if (storedDetailStep >= 0 && storedDetailStep < DETAIL_STEP_COUNT) setDetailStep(storedDetailStep);
    hydrated.current = true;
  }, []);

  const persist = useCallback(async (
    nextDraft,
    nextStep,
    id = participantId,
    session = sessionSlug,
    pageId = submissionId,
  ) => {
    if (!id || !pageId || !hydrated.current) return;
    window.localStorage.setItem(draftKey(session, pageId), JSON.stringify(nextDraft));
    window.localStorage.setItem(stepKey(session, pageId), String(nextStep));

    const requestSave = async () => {
      const hasConsent = nextDraft.contactConsent === true;
      const serverDraft = hasConsent
        ? nextDraft
        : {
          ...nextDraft,
          contactName: '',
          email: '',
          whatsapp: '',
          contactConsent: false,
          whatsappConsent: false,
          starterPackRequested: false,
        };
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          participantId: id,
          submissionId: pageId,
          sessionSlug: session,
          progressStep: nextStep,
          ...serverDraft,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
    };

    const queued = saveQueue.current.catch(() => undefined).then(requestSave);
    saveQueue.current = queued;
    try {
      await queued;
    } catch {
      // El borrador del navegador sigue disponible si el guardado remoto falla.
    }
  }, [participantId, sessionSlug, submissionId]);

  useEffect(() => {
    if (!participantId || !submissionId || !hydrated.current) return undefined;
    const timer = window.setTimeout(() => persist(draft, step), 800);
    return () => window.clearTimeout(timer);
  }, [draft, participantId, persist, step, submissionId]);

  useEffect(() => {
    if (!submissionId || !hydrated.current) return;
    window.localStorage.setItem(detailStepKey(sessionSlug, submissionId), String(detailStep));
  }, [detailStep, sessionSlug, submissionId]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  function update(field, nextValue) {
    setDraft((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function goTo(nextStep) {
    setStep(nextStep);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function chooseTemplate(id) {
    setSelectedType(id);
    update('websiteType', id);
    setDetailStep(0);
    window.setTimeout(() => {
      goTo(2);
      setSelectedType('');
    }, 170);
  }

  function moveToDetail(nextDetailStep) {
    setDetailStep(nextDetailStep);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backFromDetail() {
    if (detailStep === 0) goTo(1);
    else moveToDetail(detailStep - 1);
  }

  function applyPreset(field, presetField, option) {
    setDraft((current) => ({
      ...current,
      [field]: option.text,
      [presetField]: option.id,
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function writeOwn(field, presetField) {
    setDraft((current) => ({ ...current, [presetField]: 'custom' }));
    window.setTimeout(() => document.getElementById(`field-${field}`)?.focus(), 0);
  }

  function toggleAudience(optionId) {
    setDraft((current) => {
      const selected = Array.isArray(current.audienceSelections) ? current.audienceSelections : [];
      const nextSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      return {
        ...current,
        audienceSelections: nextSelected,
        audience: audienceText(activeGuidedOptions.audience, nextSelected),
      };
    });
    setErrors((current) => ({ ...current, audience: undefined }));
  }

  function writeOwnAudience() {
    setDraft((current) => ({ ...current, audienceSelections: [] }));
    window.setTimeout(() => document.getElementById('field-audience')?.focus(), 0);
  }

  function toggleTrust(optionId) {
    setDraft((current) => {
      const selected = Array.isArray(current.trustSelections) ? current.trustSelections : [];
      const nextSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      return {
        ...current,
        trustSelections: nextSelected,
        trustProof: trustText(nextSelected),
      };
    });
  }

  function writeOwnTrust() {
    setDraft((current) => ({ ...current, trustSelections: [] }));
    window.setTimeout(() => document.getElementById('field-trustProof')?.focus(), 0);
  }

  function completeDetails(sourceDraft = draft) {
    persist(sourceDraft, 3);
    goTo(3);
  }

  function skipDestination() {
    const field = draft.contactChannel === 'WhatsApp'
      ? 'businessWhatsapp'
      : draft.contactChannel === 'Agenda de citas'
        ? 'bookingUrl'
        : draft.contactChannel === 'Llamada telefónica'
          ? 'businessPhone'
          : 'businessEmail';
    const nextDraft = { ...draft, [field]: '' };
    setDraft(nextDraft);
    completeDetails(nextDraft);
  }

  function continueFromDetail() {
    const nextErrors = {};
    if (detailStep === 0 && !draft.company.trim()) nextErrors.company = 'Escribe el nombre de tu inmobiliaria.';
    if (detailStep === 1 && !draft.location.trim()) nextErrors.location = 'Escribe la ciudad o zona donde trabajas.';
    if (detailStep === 2 && !draft.audience.trim()) nextErrors.audience = 'Elige al menos una opción o escribe tu propio público.';
    if (detailStep === 3 && !draft.offerDetails.trim()) nextErrors.offerDetails = 'Elige un punto de partida o describe tu oferta.';

    if (detailStep === 9) {
      const businessWhatsapp = draft.businessWhatsapp.replace(/\D/g, '');
      const businessPhone = draft.businessPhone.replace(/\D/g, '');
      if (draft.contactChannel === 'WhatsApp' && businessWhatsapp && (businessWhatsapp.length < 10 || businessWhatsapp.length > 15)) nextErrors.businessWhatsapp = 'Incluye código de país y revisa el número.';
      if (draft.contactChannel === 'Llamada telefónica' && businessPhone && (businessPhone.length < 10 || businessPhone.length > 15)) nextErrors.businessPhone = 'Incluye código de país y revisa el número.';
      if (draft.contactChannel === 'Formulario de contacto' && draft.businessEmail && !EMAIL_PATTERN.test(draft.businessEmail.trim())) nextErrors.businessEmail = 'Revisa el correo comercial.';
      if (draft.contactChannel === 'Agenda de citas' && draft.bookingUrl) {
        try {
          const url = new URL(draft.bookingUrl);
          if (!['http:', 'https:'].includes(url.protocol)) nextErrors.bookingUrl = 'Usa un enlace que comience con https://';
        } catch {
          nextErrors.bookingUrl = 'Escribe un enlace completo, por ejemplo https://cal.com/tu-agenda';
        }
      }
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      document.getElementById(`field-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    if (detailStep < DETAIL_STEP_COUNT - 1) moveToDetail(detailStep + 1);
    else completeDetails();
  }

  function continueFromStyle() {
    persist(draft, 4);
    goTo(4);
  }

  function finish(sourceDraft = draft) {
    const phone = sourceDraft.whatsapp.replace(/\D/g, '');
    const nextErrors = {};

    if (sourceDraft.starterPackRequested && !phone) nextErrors.whatsapp = 'Escribe el WhatsApp donde enviaremos tu Starter Pack.';
    if (phone && (phone.length < 10 || phone.length > 15)) nextErrors.whatsapp = 'Revisa el número e incluye el código de país.';
    if (phone && !sourceDraft.contactConsent) nextErrors.contactConsent = 'Autoriza el guardado de tus datos para continuar.';

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      document.getElementById(`field-${firstField}`)?.focus();
      return;
    }

    const finishedDraft = {
      ...sourceDraft,
      email: '',
      whatsapp: phone,
      whatsappConsent: Boolean(phone && sourceDraft.contactConsent),
    };
    setDraft(finishedDraft);

    if (finishedDraft.starterPackRequested) {
      const profile = saveContactProfile(finishedDraft);
      if (profile) setContactProfile(profile);
    }

    persist(finishedDraft, 5);
    goTo(5);
  }

  function skipStarterPack() {
    const anonymousDraft = {
      ...draft,
      contactName: '',
      email: '',
      whatsapp: '',
      contactConsent: false,
      whatsappConsent: false,
      starterPackRequested: false,
    };
    setDraft(anonymousDraft);
    finish(anonymousDraft);
  }

  async function handleCopy(valueToCopy, successMessage) {
    try {
      await copyText(valueToCopy);
      setMessage(successMessage);
      persist(draft, 5);
    } catch {
      setMessage('Selecciona el texto para copiarlo');
    }
  }

  function handleLovable() {
    window.open(lovableUrl, '_blank', 'noopener,noreferrer');
    setMessage('Prompt enviado a Lovable');
    persist(draft, 5);
  }

  function startAnotherPrompt() {
    const nextSubmissionId = createCompatibleUUID();
    const nextDraft = { ...emptyDraft, ...contactFields(contactProfile) };
    window.localStorage.setItem(`runna-prompt-active:${sessionSlug}`, nextSubmissionId);
    window.localStorage.setItem(draftKey(sessionSlug, nextSubmissionId), JSON.stringify(nextDraft));
    window.localStorage.setItem(stepKey(sessionSlug, nextSubmissionId), '1');
    window.localStorage.setItem(detailStepKey(sessionSlug, nextSubmissionId), '0');
    setSubmissionId(nextSubmissionId);
    setDraft(nextDraft);
    setStep(1);
    setDetailStep(0);
    setErrors({});
    setEditingContact(false);
    setMessage('Listo para crear otra página');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function channelDestinationField() {
    if (draft.contactChannel === 'WhatsApp') {
      return <Input id="field-businessWhatsapp" label="WhatsApp comercial" value={draft.businessWhatsapp} onChange={(nextValue) => update('businessWhatsapp', nextValue)} placeholder="52 664 123 4567" type="tel" inputMode="tel" hint="Se usará para crear el enlace directo de la página." error={errors.businessWhatsapp} optional />;
    }
    if (draft.contactChannel === 'Agenda de citas') {
      return <Input id="field-bookingUrl" label="Enlace de agenda" value={draft.bookingUrl} onChange={(nextValue) => update('bookingUrl', nextValue)} placeholder="https://cal.com/tu-agenda" type="url" hint="Puede ser Calendly, Cal.com u otra agenda pública." error={errors.bookingUrl} optional />;
    }
    if (draft.contactChannel === 'Llamada telefónica') {
      return <Input id="field-businessPhone" label="Teléfono comercial" value={draft.businessPhone} onChange={(nextValue) => update('businessPhone', nextValue)} placeholder="52 664 123 4567" type="tel" inputMode="tel" hint="Se usará para crear el botón de llamada." error={errors.businessPhone} optional />;
    }
    return <Input id="field-businessEmail" label="Correo que recibirá los leads" value={draft.businessEmail} onChange={(nextValue) => update('businessEmail', nextValue)} placeholder="ventas@tuinmobiliaria.com" type="email" autoComplete="email" hint="Lovable lo usará como referencia al conectar el formulario." error={errors.businessEmail} optional />;
  }

  return (
    <main className="page-shell">
      <div className="dot-field" aria-hidden="true" />
      <div className="app-frame">
        <header className="topbar">
          <a href="/" className="brand" aria-label="Runna, inicio">
            <img src="/runna-logo.svg" alt="Runna" />
          </a>
        </header>

        <Progress step={step} detailStep={detailStep} />

        <section className={`flow-screen ${step === 2 ? 'question-screen' : ''} ${step === 3 ? 'style-screen' : ''}`} key={`${step}-${detailStep}`}>
          {step === 1 && (
            <>
              <ScreenHeading eyebrow="Elige un embudo" title="¿Qué página quieres crear?" description="Cada opción construye un recorrido y un prompt diferente." />
              <div className="choice-grid">
                {templates.map((template) => {
                  const Icon = templateIcons[template.id];
                  const selected = selectedType === template.id;
                  return (
                    <Button
                      variant="secondary"
                      className={`choice-card ${selected ? 'selected' : ''}`}
                      key={template.id}
                      aria-label={`${template.title}. ${template.description}`}
                      onPress={() => chooseTemplate(template.id)}
                    >
                      <span className="choice-icon"><Icon aria-hidden="true" /></span>
                      <span className="choice-copy"><strong>{template.title}</strong><small>{template.objective}</small></span>
                      <ArrowRight className="choice-arrow" aria-hidden="true" />
                    </Button>
                  );
                })}
              </div>
              <p className="selection-hint">Toca una opción para continuar</p>
            </>
          )}

          {step === 2 && (
            <>
              {detailStep === 0 && (
                <QuestionFrame
                  title="¿Cómo se llama tu inmobiliaria?"
                  description="Usaremos el nombre tal como quieres que aparezca en la página."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                >
                  <Input id="field-company" label="Nombre" value={draft.company} onChange={(nextValue) => update('company', nextValue)} placeholder="Ej. Horizonte Bienes Raíces" autoComplete="organization" autoFocus isRequired error={errors.company} />
                </QuestionFrame>
              )}

              {detailStep === 1 && (
                <QuestionFrame
                  title="¿En dónde trabajas?"
                  description="Puede ser una ciudad, varias colonias o una zona completa."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                >
                  <Input id="field-location" label="Ciudad o zona" value={draft.location} onChange={(nextValue) => update('location', nextValue)} placeholder="Ej. Tijuana, B.C. y zona costa" autoFocus isRequired error={errors.location} />
                </QuestionFrame>
              )}

              {detailStep === 2 && (
                <QuestionFrame
                  title="¿A quién quieres atraer?"
                  description="Elige una o varias opciones. Después puedes ajustar el texto con tus propias palabras."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                >
                  <div className="preset-grid audience-presets">
                    {activeGuidedOptions.audience.map((option) => (
                      <PresetButton
                        key={option.id}
                        option={option}
                        multiple
                        selected={(draft.audienceSelections || []).includes(option.id)}
                        onPress={() => toggleAudience(option.id)}
                      />
                    ))}
                    <WriteOwnButton selected={!(draft.audienceSelections || []).length && Boolean(draft.audience.trim())} onPress={writeOwnAudience} />
                  </div>
                  <Textarea id="field-audience" label="Así describiremos a tu público" value={draft.audience} onChange={(nextValue) => update('audience', nextValue)} placeholder="Escribe con detalle a quién quieres atraer…" isRequired error={errors.audience} />
                </QuestionFrame>
              )}

              {detailStep === 3 && (
                <QuestionFrame
                  title={activeTemplate.detailLabel}
                  description="Elige un punto de partida. El texto queda abierto para que agregues los detalles reales de tu oferta."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                >
                  <div className="preset-grid">
                    {activeGuidedOptions.offer.map((option) => (
                      <PresetButton key={option.id} option={option} selected={draft.offerPreset === option.id} onPress={() => applyPreset('offerDetails', 'offerPreset', option)} />
                    ))}
                    <WriteOwnButton selected={draft.offerPreset === 'custom'} onPress={() => writeOwn('offerDetails', 'offerPreset')} />
                  </div>
                  <Textarea id="field-offerDetails" label="Descripción editable" value={draft.offerDetails} onChange={(nextValue) => update('offerDetails', nextValue)} placeholder={activeTemplate.detailPlaceholder} hint={activeTemplate.detailHint} isRequired error={errors.offerDetails} />
                </QuestionFrame>
              )}

              {detailStep === 4 && (
                <QuestionFrame
                  title="¿Cuál es tu especialidad?"
                  description="Esto ayuda a que la página te posicione por el trabajo que quieres atraer."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                  onSkip={() => moveToDetail(5)}
                >
                  <div className="preset-grid">
                    {activeGuidedOptions.specialty.map((option) => (
                      <PresetButton key={option.id} option={option} selected={draft.specialtyPreset === option.id} onPress={() => applyPreset('specialty', 'specialtyPreset', option)} />
                    ))}
                    <WriteOwnButton selected={draft.specialtyPreset === 'custom'} onPress={() => writeOwn('specialty', 'specialtyPreset')} />
                  </div>
                  <Input id="field-specialty" label="Especialidad editable" value={draft.specialty} onChange={(nextValue) => update('specialty', nextValue)} placeholder="Ej. Preventas residenciales en la zona costa" optional />
                </QuestionFrame>
              )}

              {detailStep === 5 && (
                <QuestionFrame
                  title="¿Por qué deberían elegirte?"
                  description="Elige la idea que mejor represente tu forma real de trabajar y personalízala si hace falta."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                  onSkip={() => moveToDetail(6)}
                >
                  <div className="preset-grid">
                    {differentiatorOptions.map((option) => (
                      <PresetButton key={option.id} option={option} selected={draft.differencePreset === option.id} onPress={() => applyPreset('difference', 'differencePreset', option)} />
                    ))}
                    <WriteOwnButton selected={draft.differencePreset === 'custom'} onPress={() => writeOwn('difference', 'differencePreset')} />
                  </div>
                  <Textarea id="field-difference" label="Diferenciador editable" value={draft.difference} onChange={(nextValue) => update('difference', nextValue)} placeholder="Describe lo que tus clientes experimentan al trabajar contigo…" optional />
                </QuestionFrame>
              )}

              {detailStep === 6 && (
                <QuestionFrame
                  title="¿Qué puedes demostrar?"
                  description="Selecciona únicamente señales de confianza que puedas respaldar. Puedes elegir varias."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                  onSkip={() => moveToDetail(7)}
                >
                  <div className="preset-grid trust-presets">
                    {trustOptions.map((option) => (
                      <PresetButton
                        key={option.id}
                        option={option}
                        multiple
                        selected={(draft.trustSelections || []).includes(option.id)}
                        onPress={() => toggleTrust(option.id)}
                      />
                    ))}
                    <WriteOwnButton selected={!(draft.trustSelections || []).length && Boolean(draft.trustProof.trim())} onPress={writeOwnTrust} />
                  </div>
                  <Textarea id="field-trustProof" label="Pruebas de confianza editables" value={draft.trustProof} onChange={(nextValue) => update('trustProof', nextValue)} placeholder="Ej. 8 años en la zona y certificación AMPI vigente…" hint="Incluye cifras, nombres o testimonios solo si son verificables y tienes permiso para publicarlos." optional />
                </QuestionFrame>
              )}

              {detailStep === 7 && (
                <QuestionFrame
                  title="¿Cómo debe sonar tu página?"
                  description="El tono cambia la manera de presentar beneficios, titulares y llamados a la acción."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                >
                  <div className="tone-grid">
                    {toneOptions.map((option) => <ToneButton key={option.id} option={option} selected={draft.tone === option.value} onPress={() => update('tone', option.value)} />)}
                  </div>
                </QuestionFrame>
              )}

              {detailStep === 8 && (
                <QuestionFrame
                  title="¿Cómo quieres recibir nuevos prospectos?"
                  description="Esta será la acción principal de la página."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                >
                  <div className="channel-grid">
                    {channelOptions.map((option) => <ChannelButton key={option.id} option={option} selected={draft.contactChannel === option.value} onPress={() => update('contactChannel', option.value)} />)}
                  </div>
                </QuestionFrame>
              )}

              {detailStep === 9 && (
                <QuestionFrame
                  title={draft.contactChannel === 'WhatsApp' ? '¿A qué WhatsApp deben escribir?' : draft.contactChannel === 'Agenda de citas' ? '¿Dónde pueden reservar una cita?' : draft.contactChannel === 'Llamada telefónica' ? '¿A qué número pueden llamar?' : '¿A qué correo deben llegar los prospectos?'}
                  description="Agrégalo ahora para que Lovable pueda dejar el llamado a la acción conectado."
                  onSubmit={continueFromDetail}
                  onBack={backFromDetail}
                  onSkip={skipDestination}
                  nextLabel="Elegir estilo"
                >
                  <div className="destination-field">{channelDestinationField()}</div>
                </QuestionFrame>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="heading-icon"><Palette aria-hidden="true" /></div>
              <ScreenHeading eyebrow="Dirección de arte" title="Elige cómo debe sentirse." description="No son etiquetas: cada estilo cambia tipografía, composición, color, fotografía y movimiento." />

              <div className="style-grid">
                {visualStyles.map((style) => (
                  <StyleCard key={style.id} style={style} selected={draft.visualStyle === style.id} onPress={() => update('visualStyle', style.id)} />
                ))}
              </div>

              <div className="style-controls">
                <Select label="Intensidad del estilo" value={draft.styleIntensity} onChange={(nextValue) => update('styleIntensity', nextValue)}>{styleIntensities.map((intensity) => <option key={intensity}>{intensity}</option>)}</Select>
                <Input id="field-brandColor" label="Color de marca" value={draft.brandColor} onChange={(nextValue) => update('brandColor', nextValue)} placeholder="Ej. azul petróleo, crema y acentos dorados" hint="Acepta nombres, una descripción de paleta o un hexadecimal. Déjalo vacío para que el estilo proponga los colores." maxLength={160} optional />
              </div>

              <article className="live-prompt">
                <div className="live-prompt-toolbar">
                  <span><i aria-hidden="true" /> Prompt actualizándose en vivo</span>
                  <strong>{activeStyle.title}</strong>
                </div>
                <pre>{prompt}</pre>
              </article>

              <div className="style-actions">
                <Button size="lg" className="full-button" onPress={continueFromStyle}>Continuar <ArrowRight aria-hidden="true" /></Button>
                <Button variant="tertiary" className="back-button" onPress={() => goTo(2)}><ArrowLeft aria-hidden="true" /> Editar contenido</Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="heading-icon"><Stars02 aria-hidden="true" /></div>
              <ScreenHeading eyebrow="IA Starter Pack" title="Guarda lo que construiste." description="Te enviaremos por WhatsApp el material práctico y tus prompts." />
              <div className="starter-pack-summary">
                <div className="starter-pack-title"><FileCheck02 aria-hidden="true" /><span><strong>Tu IA Starter Pack</strong><small>Para aplicarlo después del taller</small></span></div>
                <ul>
                  <li><Check aria-hidden="true" /> Tus prompts personalizados</li>
                  <li><Check aria-hidden="true" /> Plantilla para mejores prompts</li>
                  <li><Check aria-hidden="true" /> Checklist antes de publicar</li>
                  <li><Check aria-hidden="true" /> Prompt de revisión para Lovable</li>
                </ul>
              </div>

              {contactProfile && !editingContact ? (
                <SavedContact
                  profile={contactProfile}
                  onUse={() => finish({ ...draft, ...contactFields(contactProfile), starterPackRequested: true })}
                  onEdit={() => setEditingContact(true)}
                  onSkip={skipStarterPack}
                />
              ) : (
                <form className="simple-form contact-form" onSubmit={(event) => { event.preventDefault(); finish({ ...draft, starterPackRequested: true }); }} noValidate>
                  <Input label="Tu nombre" value={draft.contactName} onChange={(nextValue) => update('contactName', nextValue)} placeholder="Ej. Andrea López" autoComplete="name" optional />
                  <Input id="field-whatsapp" label="¿A qué WhatsApp te lo enviamos?" value={draft.whatsapp} onChange={(nextValue) => update('whatsapp', nextValue)} placeholder="52 664 123 4567" type="tel" inputMode="tel" autoComplete="tel" hint="Incluye el código de país, por ejemplo 52 para México." isRequired error={errors.whatsapp} />
                  {draft.whatsapp.replace(/\D/g, '') && (
                    <div>
                      <Checkbox id="field-contactConsent" isSelected={draft.contactConsent} onChange={(nextValue) => { update('contactConsent', nextValue); update('whatsappConsent', nextValue); }} className={errors.contactConsent ? 'invalid' : ''}>
                        Acepto que Runna guarde mis datos para enviar el Starter Pack y dar seguimiento a esta sesión.
                      </Checkbox>
                      {errors.contactConsent && <p className="ui-error consent-error">{errors.contactConsent}</p>}
                    </div>
                  )}
                  <Button size="lg" className="full-button" type="submit"><MessageChatCircle aria-hidden="true" /> Recibir por WhatsApp</Button>
                  <Button variant="tertiary" className="full-button skip-button" onPress={skipStarterPack}>Continuar solo con mi prompt</Button>
                  <Button variant="tertiary" className="back-button" onPress={() => goTo(3)}><ArrowLeft aria-hidden="true" /> Regresar</Button>
                </form>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div className="success-icon"><CheckCircle aria-hidden="true" /></div>
              <ScreenHeading eyebrow="Listo para construir" title="Tu prompt tiene dirección." description="Ábrelo en Lovable o cópialo para usarlo donde prefieras." />
              {draft.starterPackRequested && draft.whatsapp && (
                <div className="pack-requested"><MessageChatCircle aria-hidden="true" /><span><strong>Starter Pack solicitado</strong><small>Este prompt quedó asociado a +{draft.whatsapp}.</small></span></div>
              )}
              <article className="prompt-result">
                <div className="prompt-toolbar"><span>{activeTemplate.title} · {activeStyle.title}</span><Check aria-hidden="true" /></div>
                <pre>{prompt}</pre>
              </article>
              <div className="result-actions">
                <Button size="lg" className="full-button lovable-button" onPress={handleLovable}><LinkExternal01 aria-hidden="true" /> Abrir y construir en Lovable</Button>
                <Button variant="secondary" size="lg" className="full-button copy-button" onPress={() => handleCopy(prompt, 'Prompt copiado')}><Copy01 aria-hidden="true" /> Copiar mi prompt</Button>
                <p className="lovable-note">Lovable abrirá el prompt listo para revisar. Presiona Send para comenzar a construir.</p>
              </div>

              <details className="qa-prompt-card">
                <summary><CheckCircle aria-hidden="true" /><span><strong>Prompt de revisión</strong><small>Úsalo después de la primera construcción</small></span></summary>
                <div>
                  <pre>{qaPrompt}</pre>
                  <Button variant="secondary" className="full-button" onPress={() => handleCopy(qaPrompt, 'Prompt de revisión copiado')}><Copy01 aria-hidden="true" /> Copiar revisión</Button>
                </div>
              </details>

              <div className="new-prompt-panel">
                <span className="new-prompt-icon"><Plus aria-hidden="true" /></span>
                <span><strong>¿Necesitas otra página?</strong><small>Tu contacto se conserva y este prompt no se perderá.</small></span>
                <Button variant="secondary" onPress={startAnotherPrompt}><Plus aria-hidden="true" /> Generar otro prompt</Button>
              </div>

              <Button variant="tertiary" className="back-button result-edit" onPress={() => { setDetailStep(0); goTo(2); }}>Editar respuestas</Button>
              <p className="responsible-note">La IA genera. Tú verificas.</p>
            </>
          )}
        </section>
      </div>
      {message && <div className="toast" role="status">{message}</div>}
    </main>
  );
}
