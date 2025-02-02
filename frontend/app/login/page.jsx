'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Login.module.css";

export default function LoginPage() {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== "undefined") {
            const user = localStorage.getItem("loggedInUser");
            if (user) {
                router.push("/");
            }
        }
    }, [router]);

    if (!isMounted) return null;

    return (
        <div className={styles.container}>
            <div className={styles.loginBox}>
                <h1 className={styles.title}>Login</h1>
                <form className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Enter your username"
                            className={styles.input}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Enter your password"
                            className={styles.input}
                        />
                    </div>
                    <button type="submit" className={styles.submitButton}>
                        Login
                    </button>
                </form>
                <p className={styles.signupLink}>
                    Don't have an account? <a href="/createaccount">Sign up</a>
                </p>
            </div>
        </div>
    );
}
