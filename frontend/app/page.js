'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import SlideShow from '@/components/Slideshow';

export default function HomePage() {
  const router = useRouter();

  const homePageImages = [
    {
      img_path: "/image0.jpg",
      img_credits: "Photo by Andre Furtado: https://www.pexels.com/photo/a-woman-sits-on-a-rock-beside-the-lake-2916820/"
    },
    {
      img_path: "/image1.jpg",
      img_credits: "Photo by Stan Swinnen: https://www.pexels.com/photo/unrecognizable-traveler-standing-on-mountain-top-and-admiring-landscape-6465964/"
    },
    {
      img_path: "/image2.jpg",
      img_credits: "Photo by Lisa Fotios: https://www.pexels.com/photo/person-holding-photo-of-plant-2769188/"
    }
  ];

  useEffect(() => {
    const user = localStorage.getItem("loggedInUser");
    if (user) {
      router.push('/dashboard');
    }
  }, []);

  return (
    <>
      <div className={styles.heroSection}>
        <SlideShow />
        <h1 className={styles.title}>Store your special moments at one place</h1>
      </div>
      <main>
        {homePageImages.map((image, index) => (
          <section key={index} className={styles.homePageSection}>
            <div className={styles.imageContainer}>
              <Image 
                src={image.img_path}
                alt={`image${index}`}
                className={styles.homePageImage}
                width={800}
                height={600}
                priority={index === 0}
              />
            </div>
            <h2 className={styles.sectionTitle}>
              {index === 0 && "Describe your special moment"}
              {index === 1 && "Describe your feelings for this moment"}
              {index === 2 && "Add a photo to remember this moment"}
            </h2>
          </section>
        ))}

        <button 
          id="sign-up-button" 
          className={styles.signUpButton}
          onClick={() => router.push('/createaccount')}
        >
          Get Started
        </button>
      </main>
    </>
  );
}