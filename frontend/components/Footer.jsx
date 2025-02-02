import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Copyright © 2025 Kabir Lamin. All rights reserved.</p>
      <section>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
      </section>
    </footer>
  );
}