'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PagosTrabajadoresRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/contabilidad/pagos-trabajadores');
  }, [router]);
  return null;
}
