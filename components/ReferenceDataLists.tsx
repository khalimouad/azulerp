'use client';
import React, { useEffect, useState } from 'react';
import { DEFAULT_REFERENCE_SETTINGS, getReferenceSettings, ReferenceSettings } from '@/lib/reference-settings';
export function ReferenceDataLists() {
  const [settings, setSettings] = useState<ReferenceSettings>(DEFAULT_REFERENCE_SETTINGS);
  useEffect(() => { const update = () => setSettings(getReferenceSettings()); update(); window.addEventListener('azulerp-reference-settings', update); window.addEventListener('verdeorto-reference-settings', update); return () => { window.removeEventListener('azulerp-reference-settings', update); window.removeEventListener('verdeorto-reference-settings', update); }; }, []);
  return (
    <>
      <datalist id="azulerp-cities">{settings.cities.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="azulerp-banks">{settings.banks.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="verdeorto-cities">{settings.cities.map((value) => <option key={value} value={value} />)}</datalist>
      <datalist id="verdeorto-banks">{settings.banks.map((value) => <option key={value} value={value} />)}</datalist>
    </>
  );
}
