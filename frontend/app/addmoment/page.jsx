'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './addmoment.module.css';

const MAX_DESCRIPTION_LENGTH = 2000;
const FEELINGS = ["happy", "sad", "angry", "scared"];

export default function AddMomentPage() {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [responseStatus, setResponseStatus] = useState({
        responseReceived: false,
        isError: false,
        message: ""
    });
    const [selectedFeelings, setSelectedFeelings] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        if (selectedFeelings.length > 0) {
            formData.append('moment-feelings', selectedFeelings.sort().join(','));
        }

        try {
            const response = await fetch('/api/addmoment', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Connection': 'Keep-Alive'
                },
                body: formData
            });

            if (response.ok) {
                setResponseStatus({
                    responseReceived: true,
                    isError: false,
                    message: "Added moment successfully"
                });
                form.reset();
                router.push('/dashboard');
            } else {
                throw new Error(response.statusText);
            }
        } catch (error) {
            setResponseStatus({
                responseReceived: true,
                isError: true,
                message: error.message || "Failed to add moment - either server is down or some other error occurred"
            });

            // Clear status after 10 seconds
            setTimeout(() => {
                setResponseStatus({
                    responseReceived: false,
                    isError: false,
                    message: ""
                });
            }, 10000);
        }
    };

    const toggleFeeling = (feeling) => {
        setSelectedFeelings(prev =>
            prev.includes(feeling)
                ? prev.filter(f => f !== feeling)
                : [...prev, feeling]
        );
    };

    return (
        <>
            {responseStatus.responseReceived && (
                <div
                    className={`${styles.fixedStatusMessage} ${responseStatus.isError ? styles.error : styles.success}`}
                >
                    {responseStatus.message}
                </div>
            )}
            <form
                id="addmoment-form"
                className={styles.form}
                onSubmit={handleSubmit}
            >
                <label htmlFor="moment-title">Title</label>
                <input
                    type="text"
                    id="moment-title"
                    name="moment-title"
                    required
                />

                <div className={styles.momentDateSection}>
                    <label htmlFor="moment-date">Date</label>
                    <input
                        type="date"
                        id="moment-date"
                        name="moment-date"
                        required
                    />
                </div>

                <label htmlFor="moment-description">Description</label>
                <textarea
                    name="moment-description"
                    id="moment-description"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    placeholder="Your message (max. 2000 characters)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                />
                <p className={styles.momentDescriptionCharsLeft}>
                    Characters left: {MAX_DESCRIPTION_LENGTH - description.length}/{MAX_DESCRIPTION_LENGTH}
                </p>

                <label>How do you feel?</label>
                <div className={styles.momentFeelings}>
                    {FEELINGS.map((feeling) => (
                        <div key={feeling}>
                            <input
                                type="checkbox"
                                id={feeling}
                                checked={selectedFeelings.includes(feeling)}
                                onChange={() => toggleFeeling(feeling)}
                            />
                            <label htmlFor={feeling}>
                                {feeling[0].toUpperCase() + feeling.slice(1)}
                            </label>
                        </div>
                    ))}
                </div>

                <div className={styles.momentImageSection}>
                    <label htmlFor="moment-image">Image</label>
                    <input
                        name="moment-image"
                        id="moment-image"
                        type="file"
                        accept=".png,.jpg"
                        onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                    />
                </div>

                {selectedImage && (
                    <div>
                        <label htmlFor="moment-image-caption">Image Caption</label>
                        <input
                            type="text"
                            id="moment-image-caption"
                            name="moment-image-caption"
                            required
                        />
                    </div>
                )}

                <div className={styles.formButtons}>
                    <input type="submit" value="Add Moment" />
                    <button type="button" onClick={() => router.push('/dashboard')}>
                        Cancel
                    </button>
                </div>
            </form>
        </>
    );
}