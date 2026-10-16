import { Suspense } from 'react';
import { cachedPattern } from './pattern';

export const instant = false;

async function Data() {
  const value = await cachedPattern();
  return <p data-repro-value>{value}</p>;
}

export default function ReproPage() {
  return (
    <Suspense fallback={<p>loading</p>}>
      <Data />
    </Suspense>
  );
}
