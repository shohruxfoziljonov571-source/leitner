import React, { useMemo } from 'react';
import VariantA from '@/components/landing/VariantA';
import VariantB from '@/components/landing/VariantB';
import VariantC from '@/components/landing/VariantC';
import VariantD from '@/components/landing/VariantD';
import VariantE from '@/components/landing/VariantE';

const VARIANTS = [VariantA, VariantB, VariantC, VariantD, VariantE] as const;
const STORAGE_KEY = 'lp_variant';

function getVariantIndex(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const idx = parseInt(stored, 10);
      if (idx >= 0 && idx < VARIANTS.length) return idx;
    }
  } catch {}
  
  // Check URL param override: ?variant=B
  const params = new URLSearchParams(window.location.search);
  const paramVariant = params.get('variant');
  if (paramVariant) {
    const idx = ['A', 'B', 'C', 'D', 'E'].indexOf(paramVariant.toUpperCase());
    if (idx >= 0) {
      try { localStorage.setItem(STORAGE_KEY, String(idx)); } catch {}
      return idx;
    }
  }

  const idx = Math.floor(Math.random() * VARIANTS.length);
  try { localStorage.setItem(STORAGE_KEY, String(idx)); } catch {}
  return idx;
}

const LandingPage: React.FC = () => {
  const variantIndex = useMemo(() => getVariantIndex(), []);
  const Component = VARIANTS[variantIndex];
  return <Component />;
};

export default LandingPage;
