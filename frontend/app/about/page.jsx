import Head from 'next/head';
import styles from './About.module.css'; // Import CSS Module

export default function About() {
    return (
        <>
            <Head>
                <title>About</title>
            </Head>
            <h1 className={styles.title}>About</h1>
            <p>Moments. A web app created by kabir lamin.</p>
        </>
    );
}
