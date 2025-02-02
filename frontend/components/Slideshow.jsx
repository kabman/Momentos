'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './Slideshow.module.css';

export default function Slideshow() {
  const [slideIndex, setSlideIndex] = useState(0);

  const quotes = [
    {
      quote_img: "/quote1.jpg",
      quote_img_credits: "Photo by Simon Berger: https://www.pexels.com/photo/landscape-photography-of-mountain-722939/",
      quote_msg: "Life is short and every moment is precious",
      quote_by: "Gad Saad",
    },
    {
      quote_img: "/quote2.jpg",
      quote_img_credits: "Photo by David Bartus: https://www.pexels.com/photo/photo-lavender-flower-field-under-pink-sky-1166209/",
      quote_msg: "We do not remember days, we remember moments",
      quote_by: "Cesar Pavese",
    },
    {
      quote_img: "/quote3.jpg",
      quote_img_credits: "Photo by Matej: https://www.pexels.com/photo/close-up-photography-of-vintage-watch-1034425/",
      quote_msg: "The little things? The little moments? They aren't little",
      quote_by: "Jon Kabat-Zinn",
    },
  ];

  useEffect(() => {
    const timeout = 10000; // 10 seconds
    const interval = setInterval(() => {
      setSlideIndex((prevIndex) => (prevIndex + 1) % quotes.length);
    }, timeout);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    if (index >= 0 && index < quotes.length) {
      setSlideIndex(index);
    }
  };

  return (
    <section className={styles.slideshow}>
      {quotes.map((quote, index) => (
        <section 
          key={index} 
          className={`${styles.slide} ${styles.fade}`}
          style={{ display: index === slideIndex ? 'block' : 'none' }}
        >
          <Image
            src={quote.quote_img}
            alt={`quote${index}`}
            className={styles.slideImage}
            width={1200}
            height={800}
            priority={index === 0}
          />
          <p className={styles.slideQuote}>{quote.quote_msg}</p>
          <p className={styles.slideQuoteBy}>by {quote.quote_by}</p>
        </section>
      ))}
      <section className={styles.slideDots}>
        {quotes.map((_, index) => (
          <span
            key={index}
            className={`${styles.dot} ${index === slideIndex ? styles.active : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </section>
    </section>
  );
}