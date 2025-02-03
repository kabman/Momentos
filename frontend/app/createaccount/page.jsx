'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateAccount from './createaccount';

export default function CreateAccountPage() {
    const router = useRouter();

    useEffect(() => {
        const user = localStorage.getItem('loggedInUser');
        if (user) {
            router.push('/');
        }
    }, [router]);

    return (
        <>
            <title>Create Account</title>
            <CreateAccount />
        </>
    );
}