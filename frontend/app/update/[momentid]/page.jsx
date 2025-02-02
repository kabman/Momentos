'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './update.module.css';

const feelings = ["happy", "sad", "angry", "scared"];
const max_description_length = 2000;

export default function EditMomentPage() {
  const router = useRouter();
  const params = useParams();
  const momentid = params?.momentid;

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [moment, setMoment] = useState(null);
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [updateStatus, setUpdateStatus] = useState({
    responseReceived: false,
    isError: false,
    message: ""
  });

  useEffect(() => {
    const user = localStorage.getItem("loggedInUser");
    if (!user) {
      router.push('/login');
      return;
    }
    setLoggedInUser(JSON.parse(user));
  }, []);

  useEffect(() => {
    if (!momentid || !loggedInUser) return;
    getMoment(momentid);
  }, [momentid, loggedInUser]);

  const getMoment = async (momentid) => {
    try {
      const url = new URL("/getmoment", window.location.origin);
      const urlSearchParams = new URLSearchParams({ 'id': momentid });
      url.search = urlSearchParams.toString();

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${loggedInUser.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(response.statusText, { cause: response.status });
      }

      const json = await response.json();
      setMoment(json);
      setDescription(json.description);
    } catch (error) {
      setUpdateStatus({
        responseReceived: true,
        isError: true,
        message: "cause" in error ? error.message : "Failed to retrieve info"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const feelingsArr = Array.from(document.querySelectorAll("#moment-feelings input"))
      .filter(el => el.checked)
      .map(el => el.value)
      .sort();

    if (feelingsArr.length > 0) {
      formData.append("moment-feelings", feelingsArr.join(','));
    }

    // Remove unchanged fields
    if (formData.get("moment-title") === moment.title) {
      formData.delete("moment-title");
    }
    if (formData.get("moment-description") === moment.description) {
      formData.delete("moment-description");
    }
    if (formData.get("moment-date") === moment.date) {
      formData.delete("moment-date");
    }
    
    const symmetricDifference = feelingsArr
      .filter(x => !moment.feelings.includes(x))
      .concat(moment.feelings.filter(x => !feelingsArr.includes(x)));
    
    if (symmetricDifference.length === 0) {
      formData.delete("moment-feelings");
    }
    
    if (formData.get("moment-image-caption") === moment.image_caption) {
      formData.delete("moment-image-caption");
    }

    const url = new URL(`/api/update/${momentid}`, window.location.origin);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${loggedInUser.access_token}`,
          "Connection": "Keep-Alive"
        },
        body: formData
      });

      if (response.ok) {
        setUpdateStatus({
          responseReceived: true,
          isError: false,
          message: "Updated moment successfully"
        });
        return;
      }
      throw new Error(response.statusText, { cause: response.status });
    } catch (error) {
      setUpdateStatus({
        responseReceived: true,
        isError: true,
        message: "cause" in error ? error.message : "Failed to update moment - either server is down or some other error occurred"
      });
      setTimeout(() => setUpdateStatus({
        responseReceived: false,
        isError: false,
        message: ""
      }), 10000);
    }
  };

  if (!moment) {
    return <p id={styles.loading}>Loading...</p>;
  }

  return (
    <>
      {updateStatus.responseReceived && (
        <FixedStatusMessage 
          is_error={updateStatus.isError} 
          message={updateStatus.message} 
        />
      )}

      <form 
        id="updatemoment-form" 
        method="post" 
        onSubmit={handleSubmit}
        className={styles.form}
      >
        <label htmlFor="moment-title">Title</label>
        <input
          type="text"
          id="moment-title"
          name="moment-title"
          defaultValue={moment.title}
        />

        <section id="moment-date-section" className={styles.momentDateSection}>
          <label htmlFor="moment-date">Date</label>
          <input
            type="date"
            id="moment-date"
            name="moment-date"
            defaultValue={moment.date}
          />
        </section>

        <label htmlFor="moment-description">Description</label>
        <textarea
          name="moment-description"
          id="moment-description"
          maxLength={max_description_length}
          placeholder="Your message (max. 2000 characters)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.momentDescription}
        />
        <p id="moment-description-chars-left" className={styles.charsLeft}>
          Characters left: {max_description_length - description.length}/{max_description_length}
        </p>

        <label htmlFor="moment-feelings">How do you feel?</label>
        <section id="moment-feelings" className={styles.momentFeelings}>
          {feelings.map(feeling => (
            <div key={feeling}>
              <input
                type="checkbox"
                id={feeling}
                value={feeling}
                defaultChecked={moment.feelings.includes(feeling)}
              />
              <label htmlFor={feeling}>
                {feeling[0].toUpperCase() + feeling.slice(1)}
              </label>
            </div>
          ))}
        </section>

        {moment.image_filename && (
          <p>Current image associated with this moment: {moment.image_filename}</p>
        )}
        
        <section id="moment-image-section" className={styles.momentImageSection}>
          <label htmlFor="moment-image">
            {moment.image_filename ? 'Change' : 'Add'} image
          </label>
          <input
            name="moment-image"
            id="moment-image"
            type="file"
            accept=".png,.jpg"
            value={selectedImage}
            onChange={(e) => setSelectedImage(e.target.value)}
          />
        </section>

        {(moment.image_filename || selectedImage) && (
          <>
            <label htmlFor="moment-image-caption">Image Caption</label>
            <input
              type="text"
              id="moment-image-caption"
              name="moment-image-caption"
              defaultValue={moment.image_caption}
              required
            />
          </>
        )}

        <section id="form-buttons" className={styles.formButtons}>
          <button type="submit">Save</button>
          <button type="button" onClick={() => router.push("/dashboard")}>
            Cancel
          </button>
        </section>
      </form>
    </>
  );
}