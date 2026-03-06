import { useState, useEffect, useCallback } from 'react';

export function useApi(apiCall, params = null, autoFetch = true) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(autoFetch);
    const [error, setError] = useState(null);

    const execute = useCallback(async (overrideParams) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiCall(overrideParams ?? params);
            setData(res.data);
            return res.data;
        } catch (err) {
            setError(err.response?.data?.error || err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiCall, params]);

    useEffect(() => {
        if (autoFetch) execute();
    }, []);

    return { data, loading, error, execute, setData };
}

export function useMutation(apiCall) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const mutate = async (...args) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiCall(...args);
            return res.data;
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { mutate, loading, error };
}
