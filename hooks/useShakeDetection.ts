// safeher-frontend/hooks/useShakeDetection.ts (UPDATED)

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { emergencyService } from '@/services/emergencyService'; // <<< NEW IMPORT

/**
 * Hook to manage the core background shake detection service.
 * In V3, this hook primarily ensures the native ShakeService is active.
 */
export const useShakeDetection = () => {
  useEffect(() => {
    if (Platform.OS === 'android') {
      console.log('🔄 Attempting to start native ShakeService...');
      
      // Start the native service which handles shake detection 
      // and maintains the persistent notification.
      emergencyService.startBackgroundShakeDetection();

      // Cleanup function to stop the service when the component unmounts (optional, but good practice)
      return () => {
        emergencyService.stopBackgroundShakeDetection();
        console.log('🛑 Native ShakeService stopped on component unmount.');
      };
    }

    // For other platforms/web, use the original foreground logic if necessary,
    // but here we focus on the core requirement: starting the native service.
    return () => {};

  }, []);
};