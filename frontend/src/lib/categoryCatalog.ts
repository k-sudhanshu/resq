// Static category catalog for the landing grid.
//
// Mirrors backend/app/content/{en,hi}/categories.yaml — same keys, same
// order, same icons, same labels. The landing page renders from this file so
// the grid paints instantly with zero network calls (the free backend
// instance can take 10–30s to wake; category names should never wait on it).
//
// Questions, escalation flags, and fallback guidance stay server-side and are
// fetched per category on the assess page, only when that category is opened.
//
// If a category is added or renamed in the backend YAML, update this list in
// the same commit.
import type { Category } from './types';
import { otherLocale, type Locale } from '@/i18n/routing';

interface CatalogEntry {
  key: string;
  icon: string;
  label: { en: string; hi: string };
}

const CATALOG: CatalogEntry[] = [
  { key: 'burn', icon: 'local_fire_department', label: { en: 'Burn', hi: 'जलना' } },
  { key: 'cut', icon: 'water_drop', label: { en: 'Cut or bleeding', hi: 'कटना या खून बहना' } },
  { key: 'fracture', icon: 'personal_injury', label: { en: 'Broken bone or sprain', hi: 'हड्डी टूटना या मोच' } },
  { key: 'choking', icon: 'air', label: { en: 'Choking', hi: 'दम घुटना' } },
  { key: 'poisoning', icon: 'coronavirus', label: { en: 'Poisoning', hi: 'ज़हर' } },
  { key: 'snake_bite', icon: 'pest_control', label: { en: 'Snake bite', hi: 'सांप का काटना' } },
  { key: 'animal_bite', icon: 'pets', label: { en: 'Dog or animal bite', hi: 'कुत्ते या जानवर का काटना' } },
  { key: 'electric_shock', icon: 'bolt', label: { en: 'Electric shock', hi: 'बिजली का झटका' } },
  { key: 'heat_stroke', icon: 'sunny', label: { en: 'Heatstroke', hi: 'लू लगना' } },
  { key: 'fainting', icon: 'falling', label: { en: 'Fainting or unconscious', hi: 'बेहोशी या बेहोश' } },
  { key: 'seizure', icon: 'neurology', label: { en: 'Seizure (fits)', hi: 'दौरा (मिर्गी)' } },
  { key: 'drowning', icon: 'pool', label: { en: 'Drowning', hi: 'डूबना' } },
  { key: 'chest_pain', icon: 'cardiology', label: { en: 'Chest pain', hi: 'सीने में दर्द' } },
  { key: 'breathing', icon: 'pulmonology', label: { en: 'Breathing difficulty', hi: 'सांस की दिक्कत' } },
  { key: 'head_injury', icon: 'psychology', label: { en: 'Head injury', hi: 'सिर की चोट' } },
  { key: 'pregnancy', icon: 'pregnant_woman', label: { en: 'Pregnancy emergency', hi: 'गर्भावस्था आपात' } },
  { key: 'stroke', icon: 'accessibility', label: { en: 'Stroke', hi: 'स्ट्रोक' } },
  { key: 'allergy', icon: 'emergency', label: { en: 'Allergic reaction', hi: 'एलर्जी' } },
  { key: 'diabetes', icon: 'bloodtype', label: { en: 'Diabetic emergency', hi: 'शुगर इमरजेंसी' } },
  { key: 'fever', icon: 'device_thermostat', label: { en: 'High fever', hi: 'तेज़ बुखार' } },
  { key: 'eye', icon: 'visibility', label: { en: 'Eye injury', hi: 'आंख की चोट' } },
  { key: 'dehydration', icon: 'local_drink', label: { en: 'Dehydration', hi: 'पानी की कमी' } },
];

/**
 * The landing grid for a locale, in display order. `label` is the requested
 * language; `label_alt` is the other one (the dual-label card design).
 */
export function getCatalogCategories(locale: Locale): Category[] {
  const other = otherLocale(locale);
  return CATALOG.map((entry) => ({
    key: entry.key,
    label: entry.label[locale],
    label_alt: entry.label[other],
    icon: entry.icon,
  }));
}
