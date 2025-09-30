export interface EmergencyAlert {
  id: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  contactsNotified: string[];
  status: 'sent' | 'failed' | 'pending';
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}