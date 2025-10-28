'use client';

import { useEffect, useRef } from 'react';
import { indeks } from '@indeks/core';
import type { IndeksConfig } from '@indeks/core';

interface IndeksWrapperProps {
  apiKey: string;
  printToConsole?: boolean;
  config?: Partial<IndeksConfig>;
  children?: React.ReactNode;
}

/**
 * Simple Indeks wrapper component for React/Next.js
 * Just drop it in your layout/app and it works!
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { IndeksWrapper } from '@indeks/react';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <IndeksWrapper apiKey="your-api-key" printToConsole={false}>
 *           {children}
 *         </IndeksWrapper>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function IndeksWrapper({
  apiKey,
  printToConsole = false,
  config = {},
  children,
}: IndeksWrapperProps) {
  const trackerRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) return;
    
    // Only initialize on client side
    if (typeof window === 'undefined') return;
    
    try {
      // Initialize tracker
      const tracker = indeks(apiKey, printToConsole, config);
      trackerRef.current = tracker;
      initializedRef.current = true;

      // Make globally available for easy access
      if (typeof window !== 'undefined') {
        (window as any).indeksTracker = tracker;
      }

      if (printToConsole) {
        console.log('🔍 Indeks Analytics initialized for React/Next.js');
      }
    } catch (error) {
      console.error('Failed to initialize Indeks:', error);
    }

    // Cleanup on unmount
    return () => {
      if (trackerRef.current?.destroy) {
        trackerRef.current.destroy();
        trackerRef.current = null;
      }
      if (typeof window !== 'undefined') {
        delete (window as any).indeksTracker;
      }
      initializedRef.current = false;
    };
  }, [apiKey, printToConsole]); // Only re-initialize if apiKey or printToConsole changes

  return <>{children}</>;
}

/**
 * Hook to access the Indeks tracker instance
 * Use this in any component to access tracker methods
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const tracker = useIndeksTracker();
 *   
 *   const handleClick = () => {
 *     if (tracker) {
 *       console.log('Session ID:', tracker.getSessionId());
 *       console.log('User ID:', tracker.getUserId());
 *       console.log('Events:', tracker.getEvents());
 *       
 *       // Track custom event
 *       tracker.trackCustomEvent('button_clicked', { 
 *         button: 'analytics' 
 *       });
 *     }
 *   };
 *   
 *   return <button onClick={handleClick}>Get Analytics</button>;
 * }
 * ```
 */
export function useIndeksTracker() {
  return typeof window !== 'undefined' ? (window as any).indeksTracker : null;
}

// Export types for TypeScript users
export type { IndeksConfig, IndeksWrapperProps };
