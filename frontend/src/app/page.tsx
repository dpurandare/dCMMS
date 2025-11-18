import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to login page for now
  redirect('/auth/login');
}
