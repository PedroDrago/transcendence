'use client';

import { useEffect, useState } from 'react';
import { decodeJwt, getStoredAppToken } from './auth';

export function useMyId(): string | undefined {
  const [myId, setMyId] = useState<string | undefined>(undefined);
  useEffect(() => {
    setMyId(decodeJwt(getStoredAppToken())?.sub as string | undefined);
  }, []);
  return myId;
}
