'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("loggedInUser");
    if (user) {
      setLoggedInUser(JSON.parse(user));
    }
  }, []);

  const onLogoClick = () => {
    router.push(loggedInUser ? '/dashboard' : '/');
  };

  const toggleProfileMenu = () => {
    setProfileMenuVisible(!profileMenuVisible);
  };

  const logout = () => {
    localStorage.removeItem("loggedInUser");
    setLoggedInUser(null);
    router.push('/');
  };

  return (
    <nav className={styles.navbar}>
      <Image
        src="/momentos-text-v3.svg"
        alt="logo"
        width={200}
        height={100}
        onClick={onLogoClick}
        className={styles.logo}
      />
      
      {!loggedInUser ? (
        <section>
          <Link href="/createaccount">Create account</Link>
          |
          <Link href="/login">Login</Link>
        </section>
      ) : (
        <section>
          <a href="#" onClick={(e) => {
            e.preventDefault();
            toggleProfileMenu();
          }}>
            {loggedInUser.username} ▼
          </a>
          <section 
            className={styles.profileMenuOptions}
            style={{ display: profileMenuVisible ? 'flex' : 'none' }}
          >
            <button onClick={() => router.push('/editprofile')}>Edit profile</button>
            <button onClick={() => router.push('/settings')}>Settings</button>
            <button onClick={logout}>Logout</button>
          </section>
        </section>
      )}
    </nav>
  );
}