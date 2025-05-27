import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LessorPostIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/Lessor/Post/new');
  }, [router]);

  return null;
} 