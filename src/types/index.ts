export interface UserProfile {
  id: string;
  name: string;
  role: 'senior' | 'worker';
  suburb: string;
  font_size: 'normal' | 'large' | 'xlarge';
  high_contrast: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  contact_name: string;
  relationship: string;
  phone_number: string;
  is_primary: boolean;
  created_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  medicine_name: string;
  dosage: string;
  reminder_time: string;
  frequency: 'daily' | 'twice_daily' | 'weekly';
  notes: string;
  is_active: boolean;
  created_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  user_id: string;
  taken_date: string;
  taken_time: string;
  status: 'taken' | 'missed' | 'skipped';
}

export interface ServiceLocation {
  id: string;
  service_name: string;
  category: string;
  address: string;
  suburb: string;
  latitude: number;
  longitude: number;
  opening_hours: string;
  capacity_status: 'available' | 'limited' | 'full';
  current_status: 'open' | 'closed' | 'limited';
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type HeatRiskLevel = 'normal' | 'warm' | 'hot';

export interface HeatAdvisory {
  level: HeatRiskLevel;
  temperatureC: number;
  headline: string;
  body: string;
  showIndoorSuggestions: boolean;
  ctaLabel: string | null;
}

export interface ServiceTag {
  id: string;
  tag_name: string;
}

export interface LocationTag {
  id: string;
  location_id: string;
  tag_id: string;
}

export interface HeatSafePlaceRecommendation {
  location: ServiceLocation;
  distanceKm: number | null;
  score: number;
  comfortTags: string[];
}

export interface Tutorial {
  id: string;
  title: string;
  content: string;
  media_url: string;
  feature_name: string;
  sort_order: number;
}

export interface ExerciseResource {
  id: string;
  title: string;
  category: string;
  description: string;
  video_url: string;
  safety_note: string;
  duration: string;
}

export interface AreaStatistic {
  id: string;
  area_name: string;
  elderly_population: number;
  service_count: number;
  support_gap_score: number;
  latitude: number;
  longitude: number;
}
