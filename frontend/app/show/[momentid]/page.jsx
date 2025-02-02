'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './show.module.css';

// Assuming these are defined elsewhere in your Next.js app
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL;
const FixedStatusMessage = ({ is_error, message }) => (
  <div className={is_error ? styles.error : styles.success}>{message}</div>
);

export default function MomentPage() {
  const [moment, setMoment] = useState(null);
  const [error, setError] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const params = useParams();
  const momentid = params?.momentid;

  const feeling_emoji_map = {
    "happy": "😄",
    "sad": "😢",
    "angry": "😠",
    "scared": "😨"
  };

  useEffect(() => {
    // Check authentication
    const user = localStorage.getItem("loggedInUser");
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setLoggedInUser(JSON.parse(user));
  }, []);

  useEffect(() => {
    if (!momentid || !loggedInUser) return;

    const fetchMoment = async () => {
      try {
        const response = await fetch(`/api/moments/${momentid}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        
        const data = await response.json();
        setMoment(data);
      } catch (error) {
        setError(error);
      }
    };

    fetchMoment();
  }, [momentid]);

  const getImageData = (image_data, image_filename) => {
    if (!image_data || image_data.length === 0) {
      return "";
    }
    const file_extension = image_filename.split('.').pop();
    let binary = "";
    for(let i = 0; i < image_data.length; i++) {
      binary += !(i - 1 & 1) ? String.fromCharCode(parseInt(image_data.substring(i - 1, i + 1), 16)) : "";
    }
    const base64_encoded = btoa(binary);
    return `data:image/${file_extension};base64,${base64_encoded}`;
  };

  const convertToHumanReadableDateTimeString = (input_date_time) => {
    const event = new Date(input_date_time);
    return event.toLocaleString('en-GB', { 
      dateStyle: 'long', 
      timeStyle: 'medium', 
      timeZone: 'IST', 
      hourCycle: 'h12' 
    });
  };

  if (error) {
    return (
      <>
        <p>{"cause" in error ? error.message : "Failed to retrieve info"}</p>
        <FixedStatusMessage 
          is_error={true} 
          message={"cause" in error ? error.message : "Failed to retrieve info"} 
        />
      </>
    );
  }

  if (!moment) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <h1>{moment.title}</h1>
      <h3>
        {new Date(moment.date).toLocaleDateString('en-GB', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}
      </h3>
      <section id="feelings-section">
        {moment.feelings.map((feeling, index) => (
          <span key={index} className={styles.feelings}>
            {feeling_emoji_map[feeling]}
          </span>
        ))}
      </section>
      <figure>
        <img 
          src={getImageData(moment.image_data, moment.image_filename)} 
          alt={moment.image_caption} 
        />
        <figcaption>{moment.image_caption}</figcaption>
      </figure>
      <p 
        className={styles.cursiveFont}
        dangerouslySetInnerHTML={{ __html: moment.description }}
      />
    </>
  );
}