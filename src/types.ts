/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Constraint {
  id: string;
  label: string;
  category: 'rythme' | 'physique';
}

export interface Interest {
  id: string;
  label: string;
}

export interface JobFamilyProfile {
  // Positive correlations with interests
  interests: Record<string, number>; // interestId -> weight (0 to 1)
  // Compatibility with constraints (1 = perfectly compatible, 0 = incompatible)
  constraints: Record<string, number>; // constraintId -> compatibility (0 to 1)
}

export interface JobFamily {
  id: string;
  name: string;
  description: string;
  icon: string;
  profile: JobFamilyProfile;
}
