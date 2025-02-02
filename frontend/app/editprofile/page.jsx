'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './editProfile.module.css';

export default function EditProfilePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [fullName, setFullName] = useState('');
    const [birthDate, setBirthDate] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('loggedInUser');
        if (!user) {
            router.push('/login');
            return;
        }
        fetchUserDetails();
    }, []);
    

    const fetchUserDetails = async () => {
        try {
            setIsLoading(true);
            const user = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch(`${PUBLIC_API_URL}/getuserdetails`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${user.access_token}`
                }
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();
            setUserDetails(data);
            setFullName(data.full_name || '');
            setBirthDate(data.birth_date || '');
            setIsLoading(false);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('loggedInUser'));
            const response = await fetch(`${PUBLIC_API_URL}/updateuserdetails`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.access_token}`
                },
                body: JSON.stringify({
                    full_name: fullName,
                    birth_date: birthDate
                })
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };


    if (isLoading) {
        return <div className={styles.loadingContainer}>Loading...</div>;
    }


    if (error) {
        return <div className={styles.errorContainer}>{error}</div>;
    }

    return (
        <div className={styles.editProfileContainer}>
            <h1 className={styles.title}>Edit profile</h1>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="fullName" className={styles.label}>
                        Full name
                    </label>
                    <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="birthDate" className={styles.label}>
                        Birth date
                    </label>
                    <input
                        id="birthDate"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className={styles.input}
                    />
                </div>

                <div className={styles.buttonGroup}>
                    <button type="submit" className={styles.submitButton}>
                        Save changes
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className={styles.cancelButton}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}