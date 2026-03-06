import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

export default function DataTable({
    columns,
    data,
    pageSize = 10,
    searchable = true,
    filters = [],
    emptyMessage = 'No records found'
}) {
    const [search, setSearch] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        let result = data;

        // Apply Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(row =>
                columns.some(col => {
                    const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : '';
                    return String(val || '').toLowerCase().includes(q);
                })
            );
        }

        // Apply Custom Filters
        Object.entries(activeFilters).forEach(([key, val]) => {
            if (val && val !== 'all') {
                result = result.filter(row => {
                    const rowVal = row[key];
                    return String(rowVal) === String(val);
                });
            }
        });

        return result;
    }, [data, search, activeFilters, columns]);

    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        const col = columns.find(c => c.key === sortKey || c.accessor === sortKey);
        if (!col) return filtered;
        const accessor = col.sortAccessor || col.accessor;
        return [...filtered].sort((a, b) => {
            const aVal = typeof accessor === 'function' ? accessor(a) : a[accessor];
            const bVal = typeof accessor === 'function' ? accessor(b) : b[accessor];
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir, columns]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(0);
    };

    const handleFilterChange = (key, val) => {
        setActiveFilters(prev => ({ ...prev, [key]: val }));
        setPage(0);
    };

    const clearFilters = () => {
        setActiveFilters({});
        setSearch('');
        setPage(0);
    };

    const SortIcon = ({ colKey }) => {
        if (sortKey !== colKey) return <ChevronsUpDown size={13} style={{ opacity: 0.3 }} />;
        return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
    };

    const hasActiveFilters = search || Object.values(activeFilters).some(v => v && v !== 'all');

    return (
        <div className="datatable">
            {(searchable || filters.length > 0) && (
                <div className="datatable-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: '300px' }}>
                        {searchable && (
                            <div className="datatable-search">
                                <Search size={15} />
                                <input
                                    placeholder="Search records..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                                />
                            </div>
                        )}

                        {filters.map(f => (
                            <div key={f.key} className="datatable-filter">
                                <select
                                    className="form-control"
                                    style={{ height: 38, fontSize: '0.85rem', width: 'auto' }}
                                    value={activeFilters[f.key] || 'all'}
                                    onChange={e => handleFilterChange(f.key, e.target.value)}
                                >
                                    <option value="all">All {f.label}</option>
                                    {f.options.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {hasActiveFilters && (
                            <button className="btn btn-sm btn-secondary" onClick={clearFilters} style={{ gap: 4 }}>
                                <X size={12} /> Clear
                            </button>
                        )}
                        <span className="datatable-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            )}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            {columns.map((col, idx) => {
                                const colKey = col.key || (typeof col.accessor === 'string' ? col.accessor : String(idx));
                                const isSortable = col.sortable !== false && col.accessor;
                                return (
                                    <th
                                        key={colKey}
                                        onClick={() => isSortable && handleSort(col.key || col.accessor)}
                                        style={{ cursor: isSortable ? 'pointer' : 'default', userSelect: 'none' }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {col.header}
                                            {isSortable && <SortIcon colKey={col.key || col.accessor} />}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((row, i) => (
                            <tr key={row.id || i}>
                                {columns.map((col, idx) => {
                                    const colKey = col.key || (typeof col.accessor === 'string' ? col.accessor : String(idx));
                                    return (
                                        <td key={colKey}>
                                            {col.render ? col.render(row) : (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor])}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {paged.length === 0 && (
                            <tr>
                                <td colSpan={columns.length}>
                                    <div className="empty-state">
                                        <h4>{emptyMessage}</h4>
                                        {hasActiveFilters && <p>Try adjusting your search or filters</p>}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && (
                <div className="datatable-pagination">
                    <button className="btn btn-sm btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <div className="datatable-page-info">
                        Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
                    </div>
                    <button className="btn btn-sm btn-secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
