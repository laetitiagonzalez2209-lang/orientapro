/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Constraint, Interest, JobFamily } from './types';

export const CONSTRAINTS: Constraint[] = [
  // Rythme
  { id: 'office_hours', label: 'Horaires de bureau', category: 'rythme' },
  { id: 'no_weekend', label: 'Pas de week-end', category: 'rythme' },
  { id: 'remote_ok', label: 'Télétravail possible', category: 'rythme' },
  { id: 'part_time', label: 'Temps partiel possible', category: 'rythme' },
  { id: 'no_night', label: 'Pas de travail de nuit', category: 'rythme' },
  
  // Physique / Environnement
  { id: 'no_heavy_lifting', label: 'Pas de port de charge', category: 'physique' },
  { id: 'calm_env', label: 'Environnement calme', category: 'physique' },
  { id: 'indoor_only', label: 'Intérieur uniquement', category: 'physique' },
  { id: 'seated_mostly', label: 'Position assise prolongée possible', category: 'physique' },
  { id: 'low_mobility', label: 'Peu de déplacements géographiques', category: 'physique' },
];

export const INTERESTS: Interest[] = [
  { id: 'customer_contact', label: 'Contact client / Relationnel' },
  { id: 'manual_work', label: 'Travail manuel' },
  { id: 'data_analysis', label: 'Analyse de données / Chiffres' },
  { id: 'helping_people', label: 'Aide à la personne' },
  { id: 'creativity', label: 'Créativité / Design' },
  { id: 'teamwork', label: 'Travail en équipe' },
  { id: 'autonomy', label: 'Autonomie / Responsabilités' },
  { id: 'outdoor', label: 'Travail au grand air' },
  { id: 'tech_interest', label: 'Attrait pour les technologies' },
  { id: 'teaching', label: 'Transmission / Pédagogie' },
  { id: 'writing', label: 'Capacités rédactionnelles' },
  { id: 'discipline', label: 'Rigueur / Respect des cadres' },
];

export const JOB_FAMILIES: JobFamily[] = [
  {
    id: 'admin',
    name: 'Administratif & Gestion',
    description: 'Gestion de documents, secrétariat, comptabilité et organisation de bureau.',
    icon: 'FileText',
    profile: {
      interests: { data_analysis: 0.9, autonomy: 0.6, teamwork: 0.5 },
      constraints: { office_hours: 1, no_weekend: 1, remote_ok: 0.8, indoor_only: 1, seated_mostly: 1, no_night: 1 }
    }
  },
  {
    id: 'artisanat',
    name: 'Artisanat & Métiers d’Art',
    description: 'Fabrication d’objets, restauration de patrimoine et travail des matières.',
    icon: 'Hammer',
    profile: {
      interests: { manual_work: 1, creativity: 0.8, autonomy: 0.7 },
      constraints: { office_hours: 0.6, no_weekend: 0.7, indoor_only: 0.8, no_heavy_lifting: 0.4 }
    }
  },
  {
    id: 'social',
    name: 'Social & Accompagnement',
    description: 'Soutien aux personnes en difficulté, conseil et insertion sociale.',
    icon: 'Users',
    profile: {
      interests: { helping_people: 1, customer_contact: 0.9, teamwork: 0.7 },
      constraints: { office_hours: 0.9, no_weekend: 1, calm_env: 0.6 }
    }
  },
  {
    id: 'logistique',
    name: 'Logistique & Transport',
    description: 'Gestion des flux de marchandises, stockage et livraison.',
    icon: 'Truck',
    profile: {
      interests: { autonomy: 0.7, teamwork: 0.6 },
      constraints: { office_hours: 0.4, no_weekend: 0.4, no_heavy_lifting: 0.2, no_night: 0.3 }
    }
  },
  {
    id: 'numerique',
    name: 'Numérique & Informatique',
    description: 'Développement web, cybersécurité, maintenance et data science.',
    icon: 'Laptop',
    profile: {
      interests: { tech_interest: 1, data_analysis: 0.9, autonomy: 0.8, creativity: 0.6 },
      constraints: { remote_ok: 1, office_hours: 0.9, seated_mostly: 1, indoor_only: 1, calm_env: 0.8 }
    }
  },
  {
    id: 'commerce',
    name: 'Commerce & Vente',
    description: 'Vente en magasin, conseil client et gestion commerciale.',
    icon: 'ShoppingBag',
    profile: {
      interests: { customer_contact: 1, teamwork: 0.6, autonomy: 0.5 },
      constraints: { office_hours: 0.3, no_weekend: 0.2, indoor_only: 0.9, no_night: 0.8, seated_mostly: 0.3 }
    }
  },
  {
    id: 'hotellerie',
    name: 'Hôtellerie-Restauration',
    description: 'Cuisine, service en salle et accueil touristique.',
    icon: 'Utensils',
    profile: {
      interests: { teamwork: 0.9, customer_contact: 0.8, manual_work: 0.7 },
      constraints: { no_weekend: 0.1, no_night: 0.1, office_hours: 0.1, no_heavy_lifting: 0.5, seated_mostly: 0.1 }
    }
  },
  {
    id: 'industrie',
    name: 'Industrie & Production',
    description: 'Fabrication industrielle, pilotage de machines et maintenance.',
    icon: 'Factory',
    profile: {
      interests: { manual_work: 0.8, tech_interest: 0.7, teamwork: 0.7 },
      constraints: { no_night: 0.3, office_hours: 0.3, calm_env: 0.2, no_heavy_lifting: 0.3 }
    }
  },
  {
    id: 'btp',
    name: 'Bâtiment (BTP)',
    description: 'Construction, rénovation, électricité et travaux publics.',
    icon: 'HardHat',
    profile: {
      interests: { manual_work: 1, outdoor: 0.8, teamwork: 0.8 },
      constraints: { indoor_only: 0.2, no_heavy_lifting: 0.1, calm_env: 0.2, office_hours: 0.8, no_weekend: 0.9 }
    }
  },
  {
    id: 'sante',
    name: 'Santé & Soins',
    description: 'Soins infirmiers, aide-soignant, rééducation et assistance médicale.',
    icon: 'Stethoscope',
    profile: {
      interests: { helping_people: 1, teamwork: 0.8, manual_work: 0.6 },
      constraints: { no_night: 0.2, no_weekend: 0.2, office_hours: 0.2, no_heavy_lifting: 0.3 }
    }
  },
  {
    id: 'agriculture',
    name: 'Agriculture & Espaces Verts',
    description: 'Culture des sols, élevage et entretien des jardins.',
    icon: 'Sprout',
    profile: {
      interests: { outdoor: 1, manual_work: 0.9, autonomy: 0.7 },
      constraints: { indoor_only: 0.1, no_heavy_lifting: 0.2, office_hours: 0.6, no_weekend: 0.5 }
    }
  },
  {
    id: 'communication',
    name: 'Communication & Médias',
    description: 'Publicité, journalisme, relations presse et événementiel.',
    icon: 'Megaphone',
    profile: {
      interests: { creativity: 1, customer_contact: 0.8, writing: 0.7 },
      constraints: { remote_ok: 0.8, office_hours: 0.7, indoor_only: 0.8 }
    }
  },
  {
    id: 'securite',
    name: 'Sécurité & Défense',
    description: 'Protection des biens et des personnes, surveillance et défense.',
    icon: 'Shield',
    profile: {
      interests: { helping_people: 0.7, teamwork: 0.8, discipline: 0.9 },
      constraints: { no_night: 0.2, no_weekend: 0.2, office_hours: 0.3, no_heavy_lifting: 0.3 }
    }
  },
  {
    id: 'education',
    name: 'Éducation & Formation',
    description: 'Enseignement, animation socioculturelle et formation professionnelle.',
    icon: 'GraduationCap',
    profile: {
      interests: { teaching: 1, helping_people: 0.8, teamwork: 0.6 },
      constraints: { office_hours: 1, no_weekend: 1, no_night: 1, indoor_only: 0.9 }
    }
  },
  {
    id: 'culture',
    name: 'Culture & Spectacle',
    description: 'Arts vivants, gestion de musées et organisation d’événements culturels.',
    icon: 'Theater',
    profile: {
      interests: { creativity: 1, customer_contact: 0.7, teamwork: 0.7 },
      constraints: { no_weekend: 0.3, no_night: 0.3, office_hours: 0.4 }
    }
  }
];
