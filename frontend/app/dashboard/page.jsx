'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

const MOMENTS_PER_PAGE = [10, 20, 50, 100];

export default function DashboardPage() {
    const router = useRouter();
    const [totalMoments, setTotalMoments] = useState(null);
    const [momentsError, setMomentsError] = useState(null);
    const [moments, setMoments] = useState([]);
    const [sortBy, setSortBy] = useState('date-asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [maxPages, setMaxPages] = useState(0);
    const [selectedMomentsPerPage, setSelectedMomentsPerPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Commented out authentication check for now
    /*
    useEffect(() => {
        const user = localStorage.getItem('loggedInUser');
        if (!user) {
            router.push('/login');
            return;
        }
    }, []);
    */

    const fetchTotalMoments = async () => {
        setTotalMoments(100);
        try {
            const response = await fetch('/api/gettotalmoments');
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const data = await response.json();
            setTotalMoments(data.total_moments);
        } catch (error) {
            setMomentsError(error instanceof Error ? error.message : 'Failed to retrieve info');
        }
    };

    const fetchMomentsList = async () => {
        setIsLoading(true)
        const mockData = Array.from({ length: 20 }, (_, i) => ({
            id: i + 1,
            title: `Moment ${i + 1}`,
            date: new Date().toISOString()
        }));

        setMoments(mockData);
        setMaxPages(5); // Mock 5 pages
        setIsLoading(false);

        try {
            const url = new URL('/api/getmomentlist');
            url.searchParams.append('page_size', MOMENTS_PER_PAGE[selectedMomentsPerPage].toString());
            url.searchParams.append('current_page', currentPage.toString());
            url.searchParams.append('sort_by', sortBy);

            if (searchQuery) {
                url.searchParams.append('search', searchQuery);
            }

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            const data = await response.json();
            setMoments(data.moments);
            setMaxPages(Math.ceil(data.moments.length / MOMENTS_PER_PAGE[selectedMomentsPerPage]));
            setIsLoading(false);
        } catch (error) {
            setMomentsError(error instanceof Error ? error.message : 'Failed to retrieve moments');
            setIsLoading(false);
        }
        
    };

    useEffect(() => {
        fetchTotalMoments();
        fetchMomentsList();
    }, [currentPage, sortBy, selectedMomentsPerPage]);

    const changeToPage = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= maxPages) {
            setCurrentPage(pageNumber);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchMomentsList();
    };

    const addNewMoment = () => {
        router.push('/addmoment');
    };

    const FixedStatusMessage = ({ isError, message }) => (
        <div className={`${styles.statusMessage} ${isError ? styles.errorMessage : styles.successMessage}`}>
            {message}
        </div>
    );

    const MomentListItem = ({ moment }) => (
        <div className={styles.momentItem}>
            <h3>{moment.title}</h3>
        </div>
    );

    return (
        <div className={styles.dashboardContainer}>
            <section className={styles.momentsHeader}>
                <section className={styles.momentsSummary}>
                    {totalMoments !== null ? (
                        <h3>Total moments: {totalMoments}</h3>
                    ) : (
                        <h3>Total moments: Retrieving...</h3>
                    )}
                    {momentsError && (
                        <FixedStatusMessage
                            isError={true}
                            message={momentsError}
                        />
                    )}
                    <button className={styles.btn} onClick={addNewMoment}>
                        Add New Moment
                    </button>
                </section>

                <section className={styles.momentsSearchBarAndSort}>
                    <input
                        type="search"
                        placeholder="Search title"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className={styles.btn} onClick={handleSearch}>
                        Search
                    </button>

                    <section>
                        <label htmlFor="sort-by">Sort by</label>
                        <select
                            id="sort-by"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="date-asc">Date posted (ascending)</option>
                            <option value="date-desc">Date posted (descending)</option>
                        </select>
                    </section>
                </section>
            </section>

            <section className={styles.momentsList}>
                {isLoading ? (
                    <div>Retrieving data...</div>
                ) : moments.length === 0 ? (
                    <div>No data found</div>
                ) : (
                    moments.map((moment) => (
                        <MomentListItem key={moment.id} moment={moment} />
                    ))
                )}
            </section>

            <section className={styles.momentsFooter}>
                <section className={styles.momentsPage}>
                    <button
                        className={styles.btn}
                        disabled={currentPage === 1}
                        onClick={() => changeToPage(currentPage - 1)}
                    >
                        Prev
                    </button>

                    {Array.from({ length: maxPages }, (_, i) => (
                        <button
                            key={i}
                            className={`${styles.btn} ${currentPage === i + 1 ? styles.activePage : ''}`}
                            onClick={() => changeToPage(i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        className={styles.btn}
                        disabled={currentPage === maxPages}
                        onClick={() => changeToPage(currentPage + 1)}
                    >
                        Next
                    </button>
                </section>

                <section className={styles.momentsPerPage}>
                    <span>Moments per page:&nbsp;</span>
                    {MOMENTS_PER_PAGE.map((momentsPerPage, index) => (
                        <button
                            key={momentsPerPage}
                            className={`${styles.btn} ${index === selectedMomentsPerPage ? styles.momentsPerPageActive : ''}`}
                            onClick={() => setSelectedMomentsPerPage(index)}
                        >
                            {momentsPerPage}
                        </button>
                    ))}
                </section>
            </section>
        </div>
    );
}