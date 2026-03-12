import React, { useMemo } from 'react';
import VariantA from '@/components/landing/VariantA';
import VariantB from '@/components/landing/VariantB';
import VariantC from '@/components/landing/VariantC';
import VariantD from '@/components/landing/VariantD';
import VariantE from '@/components/landing/VariantE';

const VARIANTS = [VariantA, VariantB, VariantC, VariantD, VariantE] as const;

function getVariantIndex(): number {
  // Check URL param override: ?variant=B
  const params = new URLSearchParams(window.location.search);
  const paramVariant = params.get('variant');
  if (paramVariant) {
    const idx = ['A', 'B', 'C', 'D', 'E'].indexOf(paramVariant.toUpperCase());
    if (idx >= 0) return idx;
  }

  // Always random - no localStorage persistence
  return Math.floor(Math.random() * VARIANTS.length);
}

const LandingPage: React.FC = () => {
  const variantIndex = useMemo(() => getVariantIndex(), []);
  const Component = VARIANTS[variantIndex];
  return <Component />;
};

export default LandingPage;
